# 기본 이미지로 Python 사용
FROM python:3.12-slim

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

# Python 의존성 파일 복사 및 설치
COPY pyproject.toml .
RUN pip install --upgrade pip \
    && pip install poetry \
    && poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi --no-root

# 프로젝트 파일 복사
COPY . .

# Django 설정 환경 변수
ENV DJANGO_SETTINGS_MODULE=config.settings

# 포트 노출
EXPOSE 8000

# 시작 스크립트 실행
CMD ["sh", "-c", "python manage.py migrate && python manage.py runserver 0.0.0.0:8000"] 