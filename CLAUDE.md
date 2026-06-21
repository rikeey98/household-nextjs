## 개발 작업 로그 워크플로

코드 작업은 `docs/dev/`의 로그 워크플로를 따른다 (`docs/dev/README.md` 참고).

- **작업 전:** `docs/dev/TODO.md`에서 task를 선택한다.
- **작업 중/후:** `docs/dev/logs/<NN-slug>/`에 템플릿을 복사해 `worklog.md`를 기록하고, `TODO.md`의 체크박스/상태를 갱신한다.
- **검증 후:** 같은 폴더에 `verification.md`를 작성한다 (`npm run lint && npm run typecheck && npm run build` + 기능 확인). 검증을 통과한 것만 ✅ 완료 처리한다.
- 코드와 함께 worklog·verification·TODO 갱신분을 커밋한다.
