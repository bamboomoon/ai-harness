// declorder 检查未导出函数是否声明在同文件内首个调用者之后，让代码按调用顺序自顶向下阅读。
// 只检查调用者全部位于声明文件内的 helper；被其他文件引用的函数属于包级能力，不约束位置。
// 用法：declorder [-w] <目录>...；-w 把违规 helper 连同文档注释移到首个调用者之后。
package main

import (
	"bytes"
	"flag"
	"fmt"
	"go/ast"
	"go/parser"
	"go/token"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

// violation 描述一个声明早于首个调用者的 helper。
type violation struct {
	path   string
	helper *ast.FuncDecl
	caller *ast.FuncDecl
	fset   *token.FileSet
}

func main() {
	write := flag.Bool("w", false, "将违规 helper 移到首个调用者之后")
	flag.Parse()

	packages, err := collectPackages(flag.Args())
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}

	remaining := 0
	for _, paths := range packages {
		for _, v := range checkPackage(paths) {
			if *write {
				if err := fixFile(v.path); err != nil {
					fmt.Fprintln(os.Stderr, err)
					os.Exit(2)
				}
				continue
			}
			pos := v.fset.Position(v.helper.Pos())
			fmt.Printf("%s:%d: %s 应声明在首个调用者 %s 之后\n", pos.Filename, pos.Line, v.helper.Name.Name, v.caller.Name.Name)
			remaining++
		}
	}
	if remaining > 0 {
		fmt.Println("运行 go run ./tools/declorder -w . 自动调整位置")
		os.Exit(1)
	}
}

// collectPackages 按目录分组 Go 文件，同一目录的文件视为同一包参与跨文件引用判断。
func collectPackages(roots []string) (map[string][]string, error) {
	packages := map[string][]string{}
	for _, root := range roots {
		err := filepath.WalkDir(root, func(path string, d fs.DirEntry, err error) error {
			if err != nil || d.IsDir() || !strings.HasSuffix(path, ".go") {
				return err
			}
			packages[filepath.Dir(path)] = append(packages[filepath.Dir(path)], path)
			return nil
		})
		if err != nil {
			return nil, err
		}
	}
	return packages, nil
}

// checkPackage 解析同一目录的全部 Go 文件（含测试），返回各文件的违规。
func checkPackage(paths []string) []violation {
	fset := token.NewFileSet()
	files := map[string]*ast.File{}
	for _, path := range paths {
		file, err := parser.ParseFile(fset, path, nil, parser.ParseComments|parser.SkipObjectResolution)
		if err != nil {
			fmt.Fprintln(os.Stderr, err)
			continue
		}
		files[path] = file
	}

	referencedIn := map[string]map[string]bool{}
	for path, file := range files {
		ast.Inspect(file, func(n ast.Node) bool {
			if name := referenceName(n); name != "" {
				if referencedIn[name] == nil {
					referencedIn[name] = map[string]bool{}
				}
				referencedIn[name][path] = true
			}
			return true
		})
	}

	var violations []violation
	for path, file := range files {
		for _, v := range checkFile(file, referencedIn) {
			v.path, v.fset = path, fset
			violations = append(violations, v)
		}
	}
	return violations
}

// checkFile 找出文件内先于首个调用者声明、且只在本文件被引用的 helper。
func checkFile(file *ast.File, referencedIn map[string]map[string]bool) []violation {
	funcs, helpers := fileHelpers(file, referencedIn)
	callers := firstCallers(funcs, helpers)

	var violations []violation
	for name, at := range helpers {
		if caller, called := callers[name]; called && at < caller {
			violations = append(violations, violation{helper: funcs[at], caller: funcs[caller]})
		}
	}
	return violations
}

// fileHelpers 返回文件内的函数声明，以及只在本文件被引用的未导出函数到其声明序号的映射。
func fileHelpers(file *ast.File, referencedIn map[string]map[string]bool) ([]*ast.FuncDecl, map[string]int) {
	var funcs []*ast.FuncDecl
	helpers := map[string]int{}
	for _, decl := range file.Decls {
		fn, ok := decl.(*ast.FuncDecl)
		if !ok {
			continue
		}
		funcs = append(funcs, fn)
		name := fn.Name.Name
		// ponytail: 按名字匹配方法，同文件不同类型的同名未导出方法会合并；需要精确时改用 go/types。
		if _, seen := helpers[name]; !seen && isHelper(fn) && len(referencedIn[name]) == 1 {
			helpers[name] = len(funcs) - 1
		}
	}
	return funcs, helpers
}

// isHelper 判断函数是否受顺序约束：未导出且不是 init/main 这类由运行时调用的入口。
func isHelper(fn *ast.FuncDecl) bool {
	return !fn.Name.IsExported() && fn.Name.Name != "init" && fn.Name.Name != "main"
}

// firstCallers 返回每个 helper 首个调用者在文件中的声明序号；递归调用自身不计。
func firstCallers(funcs []*ast.FuncDecl, helpers map[string]int) map[string]int {
	callers := map[string]int{}
	for i, fn := range funcs {
		if fn.Body == nil {
			continue
		}
		ast.Inspect(fn.Body, func(n ast.Node) bool {
			name := referenceName(n)
			if _, tracked := helpers[name]; tracked && name != fn.Name.Name {
				if _, seen := callers[name]; !seen {
					callers[name] = i
				}
			}
			return true
		})
	}
	return callers
}

// referenceName 返回标识符或选择器引用的名字，其他节点返回空串。
func referenceName(n ast.Node) string {
	switch x := n.(type) {
	case *ast.Ident:
		return x.Name
	case *ast.SelectorExpr:
		return x.Sel.Name
	}
	return ""
}

// fixFile 每次移动一个违规 helper 后重新解析，直到文件内没有违规；helper 链会逐层归位。
func fixFile(path string) error {
	for {
		src, err := os.ReadFile(path)
		if err != nil {
			return err
		}
		violations := checkPackage(packageFiles(path))
		var target *violation
		for i := range violations {
			if violations[i].path == path {
				target = &violations[i]
				break
			}
		}
		if target == nil {
			return nil
		}
		if err := os.WriteFile(path, moveAfter(src, target), 0o644); err != nil {
			return err
		}
	}
}

// packageFiles 返回与 path 同目录的 Go 文件，保证修复时的引用判断与检查一致。
func packageFiles(path string) []string {
	matches, _ := filepath.Glob(filepath.Join(filepath.Dir(path), "*.go"))
	return matches
}

// moveAfter 把 helper（含文档注释）从原位置剪下，插入到首个调用者声明之后。
func moveAfter(src []byte, v *violation) []byte {
	offset := func(p token.Pos) int { return v.fset.Position(p).Offset }

	start := v.helper.Pos()
	if v.helper.Doc != nil {
		start = v.helper.Doc.Pos()
	}
	from, to := offset(start), offset(v.helper.End())
	block := append([]byte{}, src[from:to]...)

	// 连同其后的空行一起剪下，避免留下多余空行。
	cut := to
	for cut < len(src) && src[cut] == '\n' {
		cut++
	}
	insertAt := offset(v.caller.End())

	var out bytes.Buffer
	out.Write(src[:from])
	out.Write(src[cut:insertAt])
	out.WriteString("\n\n")
	out.Write(block)
	out.Write(src[insertAt:])
	return out.Bytes()
}
