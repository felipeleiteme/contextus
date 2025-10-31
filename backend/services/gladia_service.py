import httpx
from fastapi import UploadFile, HTTPException
from config import get_settings
import logging

settings = get_settings()
logger = logging.getLogger(__name__)


async def transcribe_audio(audio_file: UploadFile) -> str:
    """
    Transcribe audio using Gladia AI API v2
    Returns the transcribed text

    Process:
    1. Upload audio file to /v2/upload
    2. Get audio_url from upload response
    3. Start transcription job with /v2/pre-recorded
    4. Poll the result_url until transcription is complete
    """
    try:
        # Read audio file content
        audio_content = await audio_file.read()

        if not audio_content:
            logger.error("Arquivo de áudio recebido vazio ou não pôde ser lido.")
            raise HTTPException(
                status_code=400,
                detail="Uploaded audio file is empty or unreadable."
            )

        filename = audio_file.filename or "audio.m4a"
        content_type = audio_file.content_type or "audio/m4a"

        async with httpx.AsyncClient(timeout=120.0) as client:
            # Step 1: Upload audio file
            logger.info("Uploading audio file to Gladia...")
            files = {
                "audio": (filename, audio_content, content_type)
            }
            headers = {
                "x-gladia-key": settings.gladia_api_key
            }

            upload_response = await client.post(
                settings.gladia_upload_url,
                files=files,
                headers=headers
            )

            try:
                upload_response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                detail = exc.response.text
                logger.error(
                    "Gladia upload API respondeu com %s: %s",
                    exc.response.status_code,
                    detail,
                )
                raise HTTPException(
                    status_code=exc.response.status_code,
                    detail=f"Gladia upload error: {detail}"
                ) from exc

            upload_result = upload_response.json()
            audio_url = upload_result.get("audio_url")

            if not audio_url:
                raise ValueError("No audio_url returned from upload")

            logger.info(f"Audio uploaded successfully: {audio_url}")

            # Step 2: Start transcription job
            logger.info("Starting transcription job...")
            transcription_payload = {
                "audio_url": audio_url
            }
            transcription_headers = {
                "x-gladia-key": settings.gladia_api_key,
                "Content-Type": "application/json"
            }

            transcription_response = await client.post(
                settings.gladia_transcription_url,
                json=transcription_payload,
                headers=transcription_headers
            )

            try:
                transcription_response.raise_for_status()
            except httpx.HTTPStatusError as exc:
                detail = exc.response.text
                logger.error(
                    "Gladia transcription API respondeu com %s: %s",
                    exc.response.status_code,
                    detail,
                )
                raise HTTPException(
                    status_code=exc.response.status_code,
                    detail=f"Gladia transcription error: {detail}"
                ) from exc

            transcription_result = transcription_response.json()
            result_url = transcription_result.get("result_url")

            if not result_url:
                raise ValueError("No result_url returned from transcription job")

            logger.info(f"Transcription job started, polling results from: {result_url}")

            # Step 3: Poll for results
            import asyncio
            max_attempts = 60  # 60 attempts with 2 second intervals = 2 minutes max
            attempt = 0

            while attempt < max_attempts:
                await asyncio.sleep(2)  # Wait 2 seconds between polls

                result_response = await client.get(
                    result_url,
                    headers={"x-gladia-key": settings.gladia_api_key}
                )

                result_response.raise_for_status()
                result_data = result_response.json()

                status = result_data.get("status")
                logger.info(f"Transcription status: {status}")

                if status == "done":
                    # Extract transcription text
                    transcription_obj = result_data.get("result", {}).get("transcription")
                    if transcription_obj:
                        transcription = transcription_obj.get("full_transcript", "")
                        if transcription:
                            logger.info("Transcription completed successfully")
                            return transcription

                    raise ValueError("Transcription completed but no text found")

                elif status == "error":
                    error_msg = result_data.get("error", "Unknown error")
                    raise ValueError(f"Transcription failed: {error_msg}")

                attempt += 1

            raise ValueError("Transcription timeout: exceeded maximum polling attempts")

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Erro inesperado na transcrição")
        raise HTTPException(
            status_code=500,
            detail=f"Transcription error: {str(e)}"
        ) from e
