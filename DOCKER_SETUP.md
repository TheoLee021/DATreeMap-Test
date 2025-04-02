# DATreeMap Docker 설정 가이드

## 목차
- [1. 프로젝트 구조](#1-프로젝트-구조)
- [2. Docker 설정 파일](#2-docker-설정-파일)
  - [2.1 Dockerfile](#21-dockerfile)
  - [2.2 docker-compose.yml](#22-docker-composeyml)
  - [2.3 .env 파일](#23-env-파일)
- [3. 설정 과정](#3-설정-과정)
  - [3.1 초기 설정](#31-초기-설정)
  - [3.2 데이터베이스 초기화](#32-데이터베이스-초기화)
- [4. 주요 설정 포인트](#4-주요-설정-포인트)
  - [4.1 GDAL/GEOS 설정](#41-gdalgeos-설정)
  - [4.2 데이터베이스 설정](#42-데이터베이스-설정)
  - [4.3 개발/프로덕션 환경 분리](#43-개발프로덕션-환경-분리)
- [5. 문제 해결](#5-문제-해결)
  - [5.1 Poetry 의존성 문제](#51-poetry-의존성-문제)
  - [5.2 데이터베이스 연결 문제](#52-데이터베이스-연결-문제)
  - [5.3 GDAL 라이브러리 문제](#53-gdal-라이브러리-문제)
- [6. 유용한 명령어](#6-유용한-명령어)
  - [6.1 컨테이너 관리](#61-컨테이너-관리)
  - [6.2 Django 관리](#62-django-관리)
  - [6.3 데이터베이스 관리](#63-데이터베이스-관리)
  - [6.4 데이터 관리](#64-데이터-관리)

## 1. 프로젝트 구조
```
DATreeMap-test/
├── config/                 # Django 프로젝트 설정
│   ├── settings.py         # 프로젝트 설정 파일
│   ├── urls.py             # URL 라우팅
│   └── wsgi.py             # WSGI 설정
├── trees/                  # 나무 데이터 앱
│   ├── management/         # Django 관리 명령어
│   │   └── commands/       # 커스텀 명령어
│   │       ├── import_trees.py  # 나무 데이터 가져오기
│   │       └── wait_for_db.py   # DB 연결 대기
│   ├── models.py           # 데이터 모델
│   ├── views.py            # 뷰 함수
│   └── urls.py             # URL 라우팅
├── users/                  # 사용자 관리 앱
├── static/                 # 정적 파일
├── templates/              # HTML 템플릿
├── Dockerfile              # Docker 이미지 설정
├── docker-compose.yml      # Docker 서비스 구성
├── docker-compose.prod.yml # 프로덕션 환경 Docker 구성
├── pyproject.toml          # Python 의존성 관리
├── poetry.lock             # Poetry 의존성 잠금 파일
├── start.sh                # 시작 스크립트
└── .env                    # 환경 변수 설정
```

## 2. Docker 설정 파일

### 2.1 Dockerfile
```dockerfile
# 공통 베이스 이미지
FROM python:3.12-slim AS base

# 환경 변수 설정
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 작업 디렉토리 설정
WORKDIR /app

# 시스템 의존성 설치 (PostGIS, GDAL, GEOS 등)
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        binutils \
        libproj-dev \
        gdal-bin \
        libgdal-dev \
        libgeos-dev \
        build-essential \
        postgresql-client \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# GDAL 환경 변수 설정
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal
ENV LIBRARY_PATH=/usr/lib/aarch64-linux-gnu
ENV LD_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu
ENV GDAL_DATA=/usr/share/gdal
ENV GDAL_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgdal.so
ENV GEOS_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgeos_c.so

# Python 의존성 파일 복사 및 설치
COPY pyproject.toml poetry.lock ./
RUN pip install --upgrade pip \
    && pip install poetry \
    && poetry config virtualenvs.create false

# 개발 환경
FROM base AS development
RUN poetry install --no-interaction --no-ansi --no-root
COPY . .
EXPOSE 8000
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]

# 프로덕션 환경
FROM base AS production
RUN poetry install --no-dev --no-interaction --no-ansi --no-root
COPY . .
RUN python manage.py collectstatic --noinput
EXPOSE 8000
CMD ["sh", "start.sh"]
```

### 2.2 docker-compose.yml
```yaml
version: '3.8'

services:
  # Django 웹 애플리케이션
  web:
    build: 
      context: .
      target: development
    command: >
      sh -c "python manage.py wait_for_db &&
             python manage.py migrate &&
             python manage.py runserver 0.0.0.0:8000"
    volumes:
      - .:/app
      - static_volume:/app/staticfiles
      - media_volume:/app/media
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    environment:
      - DJANGO_SETTINGS_MODULE=config.settings
      - DEBUG=1
      - SECRET_KEY=${DJANGO_SECRET_KEY:-django-insecure-your-secret-key-here}
      - DB_NAME=${DB_NAME:-datreemap}
      - DB_USER=${DB_USER:-datreemap}
      - DB_PASSWORD=${DB_PASSWORD:-datreemap}
      - DB_HOST=${DB_HOST:-db}
      - DB_PORT=${DB_PORT:-5432}
      - GDAL_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgdal.so
      - GEOS_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgeos_c.so
    env_file:
      - .env

  # PostgreSQL/PostGIS 데이터베이스
  db:
    image: postgis/postgis:15-3.4
    volumes:
      - postgres_data:/var/lib/postgresql/data
    environment:
      - POSTGRES_DB=${DB_NAME:-datreemap}
      - POSTGRES_USER=${DB_USER:-datreemap}
      - POSTGRES_PASSWORD=${DB_PASSWORD:-datreemap}
    expose:
      - "5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-datreemap} -d ${DB_NAME:-datreemap}"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  static_volume:
  media_volume:
```

### 2.3 .env 파일
```env
# Django 설정
DJANGO_SECRET_KEY=django-insecure-your-secret-key-here
DEBUG=1

# 데이터베이스 설정
DB_NAME=datreemap
DB_USER=datreemap
DB_PASSWORD=datreemap
DB_HOST=db
DB_PORT=5432

# GDAL/GEOS 설정
GDAL_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgdal.so
GEOS_LIBRARY_PATH=/usr/lib/aarch64-linux-gnu/libgeos_c.so

# 기타 설정
ALLOWED_HOSTS=localhost 127.0.0.1
IN_DOCKER=True
```

## 3. 설정 과정

### 3.1 초기 설정
1. 프로젝트 클론:
   ```bash
   git clone <repository-url>
   cd DATreeMap-test
   ```

2. `.env` 파일 생성:
   ```bash
   cp .env.example .env
   # 필요한 경우 환경 변수 수정
   ```

3. Poetry 의존성 업데이트:
   ```bash
   poetry lock
   ```

4. Docker 컨테이너 빌드 및 실행:
   ```bash
   docker-compose down
   docker-compose up --build
   ```

### 3.2 데이터베이스 초기화
1. 데이터베이스 마이그레이션:
   ```bash
   docker-compose exec web python manage.py migrate
   ```

2. 나무 데이터 가져오기:
   ```bash
   docker-compose exec web python manage.py import_trees "Tree Dataset_De Anza College_Backup.csv"
   ```

3. 관리자 계정 생성:
   ```bash
   docker-compose exec web python manage.py createsuperuser
   ```

4. 애플리케이션 접속:
   - 웹 애플리케이션: http://localhost:8000
   - 관리자 페이지: http://localhost:8000/admin

## 4. 주요 설정 포인트

### 4.1 GDAL/GEOS 설정
- ARM64 아키텍처(M1/M2 Mac)에 맞는 라이브러리 경로 설정
  - `/usr/lib/aarch64-linux-gnu/libgdal.so`
  - `/usr/lib/aarch64-linux-gnu/libgeos_c.so`
- 환경 변수를 통한 라이브러리 경로 관리
- Django 설정에서 동적으로 라이브러리 경로 참조

### 4.2 데이터베이스 설정
- PostgreSQL/PostGIS 사용 (공간 데이터 지원)
- 데이터베이스 연결 대기 기능 구현 (`wait_for_db` 커스텀 명령어)
- 볼륨을 통한 데이터 영속성 보장 (`postgres_data` 볼륨)
- 환경 변수를 통한 연결 정보 관리

### 4.3 개발/프로덕션 환경 분리
- 멀티 스테이지 빌드로 환경별 이미지 최적화
  - `development` 스테이지: 개발 의존성 포함, 개발 서버 실행
  - `production` 스테이지: 개발 의존성 제외, Gunicorn 사용
- 환경 변수를 통한 설정 관리 (`.env` 파일)
- 개발 환경에서는 코드 변경 시 자동 리로드 (볼륨 마운트)
- 정적/미디어 파일 분리 관리

## 5. 문제 해결

### 5.1 Poetry 의존성 문제
- `poetry.lock` 파일이 `pyproject.toml`과 동기화되지 않을 경우:
  ```bash
  poetry lock
  ```
- Docker 환경에서 Poetry 업데이트가 필요한 경우:
  ```bash
  docker run --rm -v $(pwd):/app -w /app python:3.12-slim bash -c "pip install poetry && poetry lock"
  ```

### 5.2 데이터베이스 연결 문제
- 데이터베이스 서비스가 완전히 준비될 때까지 대기하도록 설정
  - `depends_on`과 `condition: service_healthy` 사용
  - `wait_for_db` 커스텀 명령어 구현
- 연결 문제 디버깅:
  ```bash
  docker-compose exec db psql -U datreemap -d datreemap -c "\l"
  ```

### 5.3 GDAL 라이브러리 문제
- ARM64 아키텍처에 맞는 라이브러리 경로 설정
  - `/usr/lib/aarch64-linux-gnu/libgdal.so`
  - `/usr/lib/aarch64-linux-gnu/libgeos_c.so`
- 라이브러리 버전 확인:
  ```bash
  docker-compose exec web gdal-config --version
  ```
- 라이브러리 경로 확인:
  ```bash
  docker-compose exec web find / -name "libgdal.so*" 2>/dev/null
  ```

## 6. 유용한 명령어

### 6.1 컨테이너 관리
```bash
# 컨테이너 시작
docker-compose up

# 백그라운드에서 컨테이너 시작
docker-compose up -d

# 컨테이너 중지
docker-compose down

# 컨테이너 재시작
docker-compose restart

# 로그 확인
docker-compose logs -f

# 특정 서비스 로그만 확인
docker-compose logs -f web
```

### 6.2 Django 관리
```bash
# 마이그레이션
docker-compose exec web python manage.py migrate

# 마이그레이션 생성
docker-compose exec web python manage.py makemigrations

# 슈퍼유저 생성
docker-compose exec web python manage.py createsuperuser

# Django 쉘 실행
docker-compose exec web python manage.py shell

# 정적 파일 수집
docker-compose exec web python manage.py collectstatic --noinput
```

### 6.3 데이터베이스 관리
```bash
# 데이터베이스 접속
docker-compose exec db psql -U datreemap -d datreemap

# 데이터베이스 백업
docker-compose exec db pg_dump -U datreemap datreemap > backup.sql

# 데이터베이스 복원
cat backup.sql | docker-compose exec -T db psql -U datreemap -d datreemap

# 데이터베이스 리셋 (주의: 모든 데이터 삭제)
docker-compose down -v
docker-compose up --build
```

### 6.4 데이터 관리
```bash
# 나무 데이터 가져오기
docker-compose exec web python manage.py import_trees "Tree Dataset_De Anza College_Backup.csv"

# 나무 데이터 내보내기 (JSON 형식)
docker-compose exec web python manage.py dumpdata trees.Tree > trees_backup.json

# 나무 데이터 복원
docker-compose exec web python manage.py loaddata trees_backup.json

# 데이터 조회 (Django 쉘)
docker-compose exec web python manage.py shell -c "from trees.models import Tree; print(f'총 나무 데이터 수: {Tree.objects.count()}')"
```