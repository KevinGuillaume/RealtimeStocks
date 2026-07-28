import logging

import httpx
from config import SLACK_WEBHOOK_URL

logger = logging.getLogger(__name__)

_CONDITION_LABELS = {
    "price_above": "price above",
    "price_below": "price below",
    "pct_change": "% change from baseline",
}


async def notify_alert_triggered(alert: dict, message: dict) -> None:
    """Best-effort Slack notification for a fired alert.

    No-ops if SLACK_WEBHOOK_URL isn't configured. Never raises: a broken or
    slow webhook must not affect alert firing or the WS broadcast.
    """
    if not SLACK_WEBHOOK_URL:
        return

    condition = _CONDITION_LABELS.get(alert["condition"], alert["condition"])
    text = f"🔔 *{alert['symbol']}* {condition} {alert['threshold']} — now {message['price']}"

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.post(SLACK_WEBHOOK_URL, json={"text": text})
            response.raise_for_status()
    except Exception:
        logger.warning("failed to send Slack notification for alert %s", alert["id"], exc_info=True)
