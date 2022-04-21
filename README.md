# Cargo Release

Github action to automatically create a github release on merge to main.

__Only works for rust projects.__

---

## Example

```yaml
  test-release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: echo "version = \"0.1.0\"" > Cargo.toml
      - uses: manoadamro/cargo-release@v1
        with:
          owner: ${{ github.repository_owner }}
          repo: ${{ github.repository }}
          token: ${{ secrets.GITHUB_TOKEN }}
```

## Options

| name    | description                        | default      | notes                            |
|---------|------------------------------------|--------------|----------------------------------|
| repo    | name of github repo                |              | `${{ github.repository }}`       |
| owner   | owner of github repo               |              | `${{ github.repository_owner }}` |
| token   | github token                       |              | `${{ secrets.GITHUB_TOKEN }}`    |
| cargo   | path to `Cargo.toml`               | `Cargo.toml` |                                  |
| dry_run | no changes are made unless "false" | `"false"`    |                                  |