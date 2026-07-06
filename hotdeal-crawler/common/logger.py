import logging
from datetime import datetime
from pathlib import Path

LOG_DIR = Path("/home/jwon/server/logs/crawler")  # 로그 파일을 저장할 디렉토리 경로
LOG_DIR.mkdir(parents=True, exist_ok=True)  # 디렉토리가 없으면

def get_logger(name: str) -> logging.Logger:
    logger = logging.getLogger(name)
    logger.setLevel(logging.INFO)  # 기본 로그 레벨 설정 (INFO 이상만 출력)
    logger.propagate = False  # 상위 로거로 로그 전파 방지
    
    if logger.handlers:
        # 이미 핸들러가 설정되어 있으면 중복 추가 방지
        return logger

    today = datetime.now().strftime("%Y-%m-%d")
    log_file = LOG_DIR / f"{name}_{today}.log"
    
    formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
    file_handler = logging.FileHandler(log_file, encoding='utf-8')
    file_handler.setFormatter(formatter)
    
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    
    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    return logger