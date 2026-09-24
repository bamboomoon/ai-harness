package main

import (
	"os"
	"path/filepath"
	"testing"
)

// TestFixMovesHelperChainBelowCallers 验证检查能发现 helper 链违规，-w 逐层归位后不再违规，跨文件引用的函数不受约束。
func TestFixMovesHelperChainBelowCallers(t *testing.T) {
	dir := t.TempDir()
	path := filepath.Join(dir, "a.go")
	write(t, path, `package p

// leaf 是链尾 helper。
func leaf() int { return 1 }

// mid 调用 leaf。
func mid() int { return leaf() }

// Entry 是入口。
func Entry() int { return mid() + shared() }

func shared() int { return 3 }
`)
	write(t, filepath.Join(dir, "b.go"), "package p\n\nfunc Other() int { return shared() }\n")

	if got := len(checkPackage(packageFiles(path))); got != 2 {
		t.Fatalf("violations = %d, want 2", got)
	}
	if err := fixFile(path); err != nil {
		t.Fatal(err)
	}

	want := `package p

// Entry 是入口。
func Entry() int { return mid() + shared() }

// mid 调用 leaf。
func mid() int { return leaf() }

// leaf 是链尾 helper。
func leaf() int { return 1 }

func shared() int { return 3 }
`
	if got, _ := os.ReadFile(path); string(got) != want {
		t.Fatalf("fixed file:\n%s", got)
	}
}

// TestCollectPackagesGroupsGoFilesByDirectory 验证按目录归组全部 Go 文件（含测试），忽略非 Go 文件。
func TestCollectPackagesGroupsGoFilesByDirectory(t *testing.T) {
	dir := t.TempDir()
	write(t, filepath.Join(dir, "a.go"), "package p\n")
	write(t, filepath.Join(dir, "a_test.go"), "package p\n")
	write(t, filepath.Join(dir, "README.md"), "doc\n")
	if err := os.Mkdir(filepath.Join(dir, "sub"), 0o755); err != nil {
		t.Fatal(err)
	}
	write(t, filepath.Join(dir, "sub", "b.go"), "package sub\n")

	packages, err := collectPackages([]string{dir})
	if err != nil {
		t.Fatal(err)
	}
	if len(packages) != 2 || len(packages[dir]) != 2 || len(packages[filepath.Join(dir, "sub")]) != 1 {
		t.Fatalf("packages = %v", packages)
	}
	if _, err := collectPackages([]string{filepath.Join(dir, "missing")}); err == nil {
		t.Fatal("missing root must fail")
	}
}

// write 创建测试用 Go 源文件。
func write(t *testing.T, path, content string) {
	t.Helper()
	if err := os.WriteFile(path, []byte(content), 0o644); err != nil {
		t.Fatal(err)
	}
}
