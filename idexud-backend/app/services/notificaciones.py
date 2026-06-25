"""
app/services/notificaciones.py
================================
Servicio de notificaciones para alertas de vencimiento de pólizas.

Estado actual: MOCK — las funciones simulan el envío logeando la acción
e insertando un registro en la tabla alertas_vencimiento para trazabilidad.

TODO: Conectar a servicio de mensajería — este módulo debe ser reemplazado
      por una clase concreta que implemente NotificacionesBase (ver
      app/services/notificaciones_interface.py).

Para activar envíos reales:
  1. Correo: reemplazar el bloque 'MOCK' en enviar_alerta_correo por
             fastapi_mail (FastMail) con las credenciales SMTP del .env.
  2. SMS:    reemplazar el bloque 'MOCK' en enviar_alerta_sms por
             el cliente de Twilio: client.messages.create(...)
"""
import logging
from datetime import datetime, timezone

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.alerta import AlertaVencimiento, CanalAlerta, EstadoAlerta
from app.models.poliza import Poliza

logger = logging.getLogger("idexud.notificaciones")


async def enviar_alerta_correo(
    destinatario: str,
    poliza: Poliza,
    db: AsyncSession,
) -> AlertaVencimiento:
    """
    Simula el envío de un correo de alerta de vencimiento.

    Crea un registro AlertaVencimiento en la DB con estado ENVIADA
    para mantener el historial de auditoría.

    Args:
        destinatario: dirección de correo del supervisor del contrato.
        poliza:       ORM Poliza con los datos de la póliza próxima a vencer.
        db:           sesión async de SQLAlchemy.

    Returns:
        El registro AlertaVencimiento creado.
    """
    dias_restantes = poliza.dias_para_vencer

    # ── MOCK: simular envío ────────────────────────────────────────────────────
    # TODO: Conectar a servicio de mensajería — reemplazar este bloque por la
    #       implementación concreta de NotificacionesBase.enviar_email()
    logger.info(
        "[CORREO-MOCK] Para: %s | Póliza: %s | Vence en: %d días | Valor: %s",
        destinatario,
        poliza.numero_poliza,
        dias_restantes,
        poliza.valor_asegurado,
    )
    # ── Fin MOCK ───────────────────────────────────────────────────────────────

    # Cuando se activen credenciales SMTP reales, descomentar:
    # from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
    # conf = ConnectionConfig(
    #     MAIL_USERNAME=settings.MAIL_USERNAME,
    #     MAIL_PASSWORD=settings.MAIL_PASSWORD,
    #     MAIL_FROM=settings.MAIL_FROM,
    #     MAIL_PORT=settings.MAIL_PORT,
    #     MAIL_SERVER=settings.MAIL_SERVER,
    #     MAIL_STARTTLS=settings.MAIL_STARTTLS,
    #     MAIL_SSL_TLS=settings.MAIL_SSL_TLS,
    # )
    # message = MessageSchema(
    #     subject=f"Alerta: póliza {poliza.numero_poliza} vence en {dias_restantes} días",
    #     recipients=[destinatario],
    #     body=_construir_cuerpo_correo(poliza),
    #     subtype="html",
    # )
    # await FastMail(conf).send_message(message)

    alerta = AlertaVencimiento(
        poliza_id=poliza.id,
        dias_restantes=dias_restantes,
        canal=CanalAlerta.EMAIL,
        destinatario=destinatario,
        estado=EstadoAlerta.ENVIADA,
        programada_para=datetime.now(tz=timezone.utc),
        enviada_at=datetime.now(tz=timezone.utc),
    )
    db.add(alerta)
    await db.flush()
    return alerta


async def enviar_alerta_sms(
    telefono: str,
    poliza: Poliza,
    db: AsyncSession,
) -> AlertaVencimiento:
    """
    Simula el envío de un SMS de alerta de vencimiento.

    Args:
        telefono: número de teléfono en formato E.164 (+573001234567).
        poliza:   ORM Poliza con los datos.
        db:       sesión async de SQLAlchemy.

    Returns:
        El registro AlertaVencimiento creado.
    """
    dias_restantes = poliza.dias_para_vencer

    # ── MOCK: simular envío ────────────────────────────────────────────────────
    # TODO: Conectar a servicio de mensajería — reemplazar este bloque por la
    #       implementación concreta de NotificacionesBase.enviar_sms()
    logger.info(
        "[SMS-MOCK] Para: %s | Póliza: %s | Vence en: %d días",
        telefono,
        poliza.numero_poliza,
        dias_restantes,
    )
    # ── Fin MOCK ───────────────────────────────────────────────────────────────

    # Cuando se activen credenciales Twilio reales, descomentar:
    # from twilio.rest import Client
    # client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
    # client.messages.create(
    #     body=f"IDEXUD: Póliza {poliza.numero_poliza} vence en {dias_restantes} días.",
    #     from_=settings.TWILIO_FROM_NUMBER,
    #     to=telefono,
    # )

    alerta = AlertaVencimiento(
        poliza_id=poliza.id,
        dias_restantes=dias_restantes,
        canal=CanalAlerta.SMS,
        destinatario=telefono,
        estado=EstadoAlerta.ENVIADA,
        programada_para=datetime.now(tz=timezone.utc),
        enviada_at=datetime.now(tz=timezone.utc),
    )
    db.add(alerta)
    await db.flush()
    return alerta


async def notificar_poliza_por_vencer(
    poliza: Poliza,
    db: AsyncSession,
    correo: str | None = None,
    telefono: str | None = None,
) -> list[AlertaVencimiento]:
    """
    Orquesta el envío de todas las alertas disponibles para una póliza.

    Llamar desde el scheduler APScheduler o desde un endpoint de admin.

    Args:
        poliza:   póliza próxima a vencer.
        db:       sesión async.
        correo:   destinatario de correo (usa poliza.contratista.email si es None).
        telefono: destinatario SMS      (usa poliza.contratista.telefono si es None).

    Returns:
        Lista de registros AlertaVencimiento creados.
    """
    alertas: list[AlertaVencimiento] = []

    destino_email = correo or (
        poliza.contratista.email if poliza.contratista else None
    )
    destino_sms = telefono or (
        poliza.contratista.telefono if poliza.contratista else None
    )

    if destino_email:
        alertas.append(await enviar_alerta_correo(destino_email, poliza, db))

    if destino_sms:
        alertas.append(await enviar_alerta_sms(destino_sms, poliza, db))

    if alertas:
        # Incrementar el contador de alertas de la póliza
        poliza.alertas_enviadas = (poliza.alertas_enviadas or 0) + len(alertas)

    return alertas
