import os

from dotenv import load_dotenv

load_dotenv()

ALPACA_API_KEY = os.environ["ALPACA_API_KEY"]
ALPACA_SECRET_KEY = os.environ["ALPACA_SECRET_KEY"]
DATABASE_URL = os.environ["DATABASE_URL"]
DATABASE_URL_DIRECT = os.environ["DATABASE_URL_DIRECT"]

# Optional: Slack Incoming Webhook URL. When unset, Slack notifications are
# silently skipped (see slack_notify.py).
SLACK_WEBHOOK_URL = os.environ.get("SLACK_WEBHOOK_URL")

# Origin the frontend is served from, for CORS. Defaults to the Vite dev
# server so local development keeps working without a .env entry.
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:5173")
