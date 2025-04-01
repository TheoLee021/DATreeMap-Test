FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    nginx \
    binutils \
    libproj-dev \
    gdal-bin \
    libgdal-dev \
    python3-gdal \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# GDAL 환경변수 설정 추가
ENV CPLUS_INCLUDE_PATH=/usr/include/gdal
ENV C_INCLUDE_PATH=/usr/include/gdal

COPY nginx.conf /etc/nginx/conf.d/default.conf

# pyproject.toml과 README.md 먼저 복사
COPY pyproject.toml README.md ./

# 먼저 모든 파일 복사
COPY . .

# 그 다음 Poetry 설치 및 의존성 설치
RUN pip install --upgrade pip \
    && pip install poetry \
    && poetry config virtualenvs.create false \
    && poetry install --no-interaction --no-ansi

COPY start.sh /start.sh
RUN chmod +x /start.sh

CMD ["/start.sh"]