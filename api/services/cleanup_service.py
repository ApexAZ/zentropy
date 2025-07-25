"""
Background Cleanup Service for Performance Optimization

Handles periodic cleanup of expired verification codes and operation tokens
to maintain database performance and prevent table bloat.

Features:
- Configurable cleanup schedules
- Batch processing to minimize database impact
- Comprehensive logging for monitoring
- Graceful error handling

Created: 2025-07-21
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Dict, Any

try:
    from apscheduler.schedulers.asyncio import AsyncIOScheduler  # type: ignore
    from apscheduler.triggers.interval import IntervalTrigger  # type: ignore

    SCHEDULER_AVAILABLE = True
except ImportError:
    # APScheduler not installed - provide fallback
    AsyncIOScheduler = None  # type: ignore
    IntervalTrigger = None  # type: ignore
    SCHEDULER_AVAILABLE = False  # type: ignore
    logging.warning("APScheduler not installed. Background cleanup will be disabled.")

from ..database import SessionLocal, UsedOperationToken
from ..verification_service import VerificationCode

logger = logging.getLogger(__name__)


class CleanupService:
    """Background service for database cleanup tasks"""

    def __init__(self):
        self.scheduler: Any = None
        self.is_running = False

        # Cleanup configuration
        self.config = {
            # Verification codes cleanup
            "verification_codes": {
                "interval_hours": 1,  # Run every hour
                "batch_size": 1000,  # Process in batches to avoid long locks
                "retention_hours": 24,  # Keep expired codes for 24 hours for audit
            },
            # Operation tokens cleanup
            "operation_tokens": {
                "interval_hours": 6,  # Run every 6 hours
                "batch_size": 500,  # Smaller batches for tokens
                "retention_hours": 2,  # Shorter retention for tokens
            },
        }

    async def start_scheduler(self) -> None:
        """Start the background cleanup scheduler"""
        if not SCHEDULER_AVAILABLE:
            logger.warning(
                "⚠️  APScheduler not available - background cleanup disabled"
            )  # noqa: E501
            logger.info(
                "💡 Install APScheduler for automated cleanup: pip install apscheduler"  # noqa: E501
            )
            return

        if self.is_running:
            logger.warning("Cleanup scheduler is already running")
            return

        try:
            if AsyncIOScheduler is None or IntervalTrigger is None:
                raise ImportError("APScheduler components not available")

            self.scheduler = AsyncIOScheduler()

            # Schedule verification codes cleanup
            self.scheduler.add_job(
                func=self._cleanup_verification_codes,
                trigger=IntervalTrigger(
                    hours=self.config["verification_codes"]["interval_hours"]
                ),
                id="cleanup_verification_codes",
                name="Cleanup Expired Verification Codes",
                replace_existing=True,
                max_instances=1,  # Prevent overlapping runs
            )

            # Schedule operation tokens cleanup
            self.scheduler.add_job(
                func=self._cleanup_operation_tokens,
                trigger=IntervalTrigger(
                    hours=self.config["operation_tokens"]["interval_hours"]
                ),
                id="cleanup_operation_tokens",
                name="Cleanup Used Operation Tokens",
                replace_existing=True,
                max_instances=1,  # Prevent overlapping runs
            )

            self.scheduler.start()
            self.is_running = True

            logger.info("✅ Cleanup scheduler started successfully")
            logger.info(
                f"📅 Verification codes cleanup: every "
                f"{self.config['verification_codes']['interval_hours']} hours"
            )
            logger.info(
                f"📅 Operation tokens cleanup: every "
                f"{self.config['operation_tokens']['interval_hours']} hours"
            )

        except Exception as e:
            logger.error(f"❌ Failed to start cleanup scheduler: {e}")
            self.is_running = False
            raise

    async def stop_scheduler(self) -> None:
        """Stop the background cleanup scheduler"""
        if not self.is_running or not self.scheduler:
            return

        try:
            self.scheduler.shutdown(wait=True)
            self.scheduler = None
            self.is_running = False
            logger.info("⏹️  Cleanup scheduler stopped")
        except Exception as e:
            logger.error(f"❌ Error stopping cleanup scheduler: {e}")

    async def _cleanup_verification_codes(self) -> None:
        """Clean up expired verification codes in batches"""
        start_time = datetime.now(timezone.utc)
        total_cleaned = 0

        try:
            logger.info("🧹 Starting verification codes cleanup")

            # Calculate retention cutoff
            retention_cutoff = start_time - timedelta(
                hours=self.config["verification_codes"]["retention_hours"]
            )

            with SessionLocal() as db:
                batch_size = self.config["verification_codes"]["batch_size"]

                while True:
                    # Clean expired codes in batches to avoid long locks
                    # First, select IDs to delete
                    # (SQLAlchemy doesn't support LIMIT with DELETE)
                    ids_to_delete = (
                        db.query(VerificationCode.id)
                        .filter(
                            (VerificationCode.expires_at <= retention_cutoff)
                            | (VerificationCode.is_used.is_(True))
                        )
                        .limit(batch_size)
                        .all()
                    )

                    if not ids_to_delete:
                        break

                    # Extract IDs and delete by ID list
                    id_list = [row.id for row in ids_to_delete]
                    result = (
                        db.query(VerificationCode)
                        .filter(VerificationCode.id.in_(id_list))
                        .delete(synchronize_session=False)
                    )

                    total_cleaned += result
                    db.commit()

                    # Brief pause to avoid overwhelming the database
                    await asyncio.sleep(0.1)

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()

            logger.info(
                f"✅ Verification codes cleanup completed: "
                f"{total_cleaned} codes removed in {duration:.2f}s"
            )

        except Exception as e:
            logger.error(f"❌ Verification codes cleanup failed: {e}")
            raise

    async def _cleanup_operation_tokens(self) -> None:
        """Clean up expired operation tokens in batches"""
        start_time = datetime.now(timezone.utc)
        total_cleaned = 0

        try:
            logger.info("🧹 Starting operation tokens cleanup")

            # Calculate retention cutoff
            retention_cutoff = start_time - timedelta(
                hours=self.config["operation_tokens"]["retention_hours"]
            )

            with SessionLocal() as db:
                batch_size = self.config["operation_tokens"]["batch_size"]

                while True:
                    # Clean expired tokens in batches
                    # First, select JTIs to delete
                    # (SQLAlchemy doesn't support LIMIT with DELETE)
                    jtis_to_delete = (
                        db.query(UsedOperationToken.jti)
                        .filter(UsedOperationToken.expires_at <= retention_cutoff)
                        .limit(batch_size)
                        .all()
                    )

                    if not jtis_to_delete:
                        break

                    # Extract JTIs and delete by JTI list
                    jti_list = [row.jti for row in jtis_to_delete]
                    result = (
                        db.query(UsedOperationToken)
                        .filter(UsedOperationToken.jti.in_(jti_list))
                        .delete(synchronize_session=False)
                    )

                    total_cleaned += result
                    db.commit()

                    # Brief pause to avoid overwhelming the database
                    await asyncio.sleep(0.1)

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()

            logger.info(
                f"✅ Operation tokens cleanup completed: "
                f"{total_cleaned} tokens removed in {duration:.2f}s"
            )

        except Exception as e:
            logger.error(f"❌ Operation tokens cleanup failed: {e}")
            raise

    async def manual_cleanup(self, cleanup_type: str = "all") -> Dict[str, Any]:
        """
        Manually trigger cleanup operations (for testing/admin use)

        Args:
            cleanup_type: "all", "verification_codes", or "operation_tokens"

        Returns:
            Dict with cleanup results
        """
        start_time = datetime.now(timezone.utc)
        results = {}

        try:
            if cleanup_type in ["all", "verification_codes"]:
                await self._cleanup_verification_codes()
                results["verification_codes"] = "completed"

            if cleanup_type in ["all", "operation_tokens"]:
                await self._cleanup_operation_tokens()
                results["operation_tokens"] = "completed"

            duration = (datetime.now(timezone.utc) - start_time).total_seconds()
            results["total_duration_seconds"] = duration
            results["status"] = "success"

            return results

        except Exception as e:
            results["status"] = "error"
            results["error"] = str(e)
            return results

    def get_scheduler_status(self) -> Dict[str, Any]:
        """Get current scheduler status and next run times"""
        if not self.is_running or not self.scheduler:
            return {"running": False}

        status = {"running": True, "jobs": []}

        for job in self.scheduler.get_jobs():
            status["jobs"].append(
                {
                    "id": job.id,
                    "name": job.name,
                    "next_run": (
                        job.next_run_time.isoformat() if job.next_run_time else None
                    ),
                }
            )

        return status


# Global cleanup service instance
cleanup_service = CleanupService()
