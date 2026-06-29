# Eat Me

Eat Me는 냉장고 속 식재료를 관리하고, 보유한 재료를 기반으로 식생활을 더 효율적으로 운영할 수 있도록 돕는 서비스입니다.

## Overview

냉장고에 있는 식재료는 쉽게 잊히고, 유통기한이 지나 폐기되는 일이 자주 발생합니다. Eat Me는 식재료 등록, 보관 상태 확인, 만료 임박 알림, 폐기 손실 분석, 보유 재료 기반 레시피 탐색을 통해 이런 문제를 줄이는 것을 목표로 합니다.

## Key Features

- 냉장고 식재료 등록 및 관리
- 보관 위치, 카테고리, 유통기한 기반 식재료 정리
- 만료 임박 식재료 확인
- 폐기한 식재료와 금전 손실 추적
- 월별 폐기 손실 인사이트
- 보유 재료 기반 레시피 탐색

## Project Structure

이 저장소는 프론트엔드, 백엔드, 공유 스키마를 함께 관리하는 모노레포입니다.

```text
eat-me/
├─ apps/
│  ├─ web/
│  └─ api/
└─ packages/
   └─ schemas/
```

## Tech Stack

- Frontend: Next.js, React, Apollo Client, Tailwind CSS
- Backend: NestJS, GraphQL, Prisma
- Database: PostgreSQL
- Workspace: pnpm

## Status

현재 개발 중인 프로젝트입니다.
