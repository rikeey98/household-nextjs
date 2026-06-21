# 개발 작업 로그 워크플로

이 폴더는 코드 작업의 **기록**을 담는다.
스펙(`docs/1-product-spec.md` · `2-architecture.md`)이 *"무엇을 / 어떻게 만들 것인가"* 라면,
여기는 *"언제 · 무엇을 했고 · 어떻게 검증했는가"* 를 남긴다.

## 폴더 구조

```
docs/dev/
├── README.md            # (이 문서) 워크플로 정의
├── TODO.md              # 마스터 개발 TODO (Phase별 체크리스트)
└── logs/
    ├── _templates/      # worklog · verification 템플릿
    │   ├── worklog.md
    │   └── verification.md
    └── <NN-slug>/       # 작업(task) 단위 폴더
        ├── worklog.md       # 작업 진행 로그
        └── verification.md  # 검증 결과
```

## 작업 사이클 (task마다 반복)

1. **TODO 선택/도출** — `TODO.md`에서 다음 task를 고른다. 없으면 스펙을 보고 추가한다.
2. **로그 폴더 생성** — `logs/<NN-slug>/`를 만들고 `_templates/`의 두 파일을 복사한다.
3. **코딩** — 작업하면서 `worklog.md`를 갱신한다 (무엇을 · 왜 · 어떤 파일).
4. **결과 반영** — `TODO.md`의 체크박스/상태를 업데이트한다.
5. **검증** — `npm run lint && npm run typecheck && npm run build` (+ 기능 확인) 후 `verification.md`를 작성한다.
6. **커밋** — 코드와 함께 worklog·verification·TODO 갱신분을 커밋한다.

## 작업 ID 규칙

`<NN>-<slug>` 형식.
- `NN` = 2자리 순번 (Phase 진행과 느슨하게 정렬).
- `slug` = kebab-case 요약.
- 예: `01-supabase-auth`, `02-transaction-crud`.

## 상태 범례

| 기호 | 뜻 |
|---|---|
| ⬜ | 예정 (not started) |
| 🔄 | 진행 중 (in progress) |
| ✅ | 완료 (done) |
| ⏸️ | 보류 (blocked / on hold) |
| ❌ | 폐기 (dropped) |

## 원칙

- worklog는 **사실의 기록**(한 일·결정·막힌 점), verification은 **검증의 증거**(명령 출력·기능 확인).
- 완료(✅)는 검증을 통과한 것만. 검증 없이 완료 처리하지 않는다.
- 보류 결정·트레이드오프는 worklog에 남겨 다음 세션이 맥락을 잃지 않게 한다.
