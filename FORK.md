# Fork 유지보수

## 원격 및 브랜치 구조

- **원격**: `origin`은 upstream `getpaseo/paseo`, `fork`는 `ruuuuubyist/paseo`입니다.
- **`main`**: `origin/main`을 `--ff-only`로 반영하는 미러입니다. fork 전용 커밋은 넣지 않습니다.
- **`downstream/main`**: fork 전용 작업을 통합하는 장기 브랜치입니다. 작업 PR은 squash merge로 통합합니다(merge commit으로 통합하면 rebase 때 충돌을 다시 해결해야 합니다). force push는 통합 담당자만 합니다.
- **`feat/*`**: `downstream/main`에서 분기합니다. upstream에 기여할 변경은 `origin/main`에서 분기해 `getpaseo/paseo`에 PR을 엽니다.

## PR 생성

- **GitHub 웹**: fork 브랜치 PR 생성 시 base 저장소가 기본적으로 upstream으로 지정되므로, base를 `ruuuuubyist/paseo`의 `downstream/main`으로 변경합니다.
- **`gh` CLI**: 최초 1회 기본 저장소를 설정한 후 생성합니다.

```bash
gh repo set-default ruuuuubyist/paseo
gh pr create --base downstream/main
```

## upstream 갱신 절차

GitHub에서 머지된 PR은 `fork/downstream/main`에만 있으므로 rebase 전에 `--ff-only`로 반영합니다. `--force-with-lease`만 쓰면 fetch 후 로컬에 반영하지 않은 머지 커밋을 덮어쓸 수 있으므로 `--force-if-includes`를 함께 지정합니다.

```bash
git fetch origin main
git fetch fork

git switch main
git merge --ff-only origin/main
git push fork main

git switch downstream/main
git merge --ff-only fork/downstream/main
old=$(git rev-parse HEAD)
git rebase origin/main
npm run typecheck
npm run lint
git push --force-with-lease --force-if-includes fork downstream/main
```

## 열린 작업 브랜치 이동

갱신 절차와 같은 셸(`$old` 변수 유지)에서 아래 명령으로 작업 브랜치를 새 `downstream/main` 위로 옮깁니다. 옮기지 않으면 PR diff에 rebase 이전 커밋이 섞입니다.

```bash
git rebase --onto downstream/main "$old" feat/<topic>
git push --force-with-lease --force-if-includes fork feat/<topic>
```
