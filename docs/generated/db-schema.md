<!-- AUTO-GENERATED: Do not edit manually. Run: pnpm docs:gen-schema -->
# Database Schema Reference

Generated: 2026-03-28
Source: `src/config/db/schema.postgres.ts`

---

## user

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| name | text | YES |  |
| email | text | YES | UNIQUE |
| emailVerified | boolean | YES |  |
| image | text | no |  |
| createdAt | timestamp | YES | default: now() |
| updatedAt | timestamp | no |  |

## session

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| expiresAt | timestamp | YES |  |
| token | text | YES | UNIQUE |
| createdAt | timestamp | YES | default: now() |
| updatedAt | timestamp | no |  |
| ipAddress | text | no |  |
| userAgent | text | no |  |
| userId | text | no |  |

## account

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| accountId | text | YES |  |
| providerId | text | YES |  |
| userId | text | no |  |

## verification

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| identifier | text | YES |  |
| value | text | YES |  |
| expiresAt | timestamp | YES |  |
| createdAt | timestamp | YES | default: now() |
| updatedAt | timestamp | no |  |

## config

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| name | text | YES | UNIQUE |
| value | text | no |  |

## taxonomy

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## post

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## order

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| orderNo | text | YES | UNIQUE |
| userId | text | no |  |

## subscription

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| subscriptionNo | text | YES | UNIQUE |
| userId | text | no |  |

## credit

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## apikey

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## role

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| name | text | YES | UNIQUE |
| title | text | YES |  |
| description | text | no |  |
| status | text | YES |  |
| createdAt | timestamp | YES | default: now() |
| updatedAt | timestamp | no |  |
| sort | integer | YES |  |

## permission

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| code | text | YES | UNIQUE |
| resource | text | YES |  |
| action | text | YES |  |
| title | text | YES |  |
| description | text | no |  |
| createdAt | timestamp | YES | default: now() |
| updatedAt | timestamp | no |  |

## role_permission

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| roleId | text | no |  |

## user_role

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## ai_task

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## chat

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## chat_message

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | YES | PK |
| userId | text | no |  |

## usage_log

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| id | text | no |  |
| userId | text | no |  |
| appId | text | YES |  |
| product | text | YES |  |
| model | text | no |  |
| type | text | YES |  |
| tokens | integer | no |  |
| cost | text | no |  |
| status | text | no |  |
| metadata | text | no |  |
| createdAt | timestamp | YES | default: now() |

---

## Table Summary

| Table | Columns |
|-------|---------|
| user | 7 |
| session | 8 |
| account | 4 |
| verification | 6 |
| config | 2 |
| taxonomy | 2 |
| post | 2 |
| order | 3 |
| subscription | 3 |
| credit | 2 |
| apikey | 2 |
| role | 8 |
| permission | 8 |
| role_permission | 2 |
| user_role | 2 |
| ai_task | 2 |
| chat | 2 |
| chat_message | 2 |
| usage_log | 11 |

_Total: 19 tables_
