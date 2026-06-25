"""
app/services/notificaciones_interface.py
=========================================
Contrato (interfaz) que define los métodos que debe implementar cualquier
servicio de mensajería real: correo electrónico y SMS.

El ingeniero de TI debe crear una clase concreta que herede de
NotificacionesBase e implemente los dos métodos abstractos.

Ejemplo de integración futura:

    # services/notificaciones_sendgrid.py
    from app.services.notificaciones_interface import NotificacionesBase
    import sendgrid

    class NotificacionesSendGrid(NotificacionesBase):
        async def enviar_email(self, destinatario, asunto, mensaje):
            # lógica con el SDK de SendGrid
            ...

        async def enviar_sms(self, numero, mensaje):
            # lógica con Twilio u otro proveedor
            ...

Una vez implementada, registrar la clase en el contenedor de dependencias
de FastAPI (app/api/deps.py) para que los endpoints la reciban via Depends().

TODO: Conectar a servicio de mensajería — implementar esta interfaz con las
      credenciales SMTP / Twilio del .env y registrar en deps.py.
"""

from abc import ABC, abstractmethod


class NotificacionesBase(ABC):
    """
    Interfaz abstracta para servicios de notificación.

    Toda implementación concreta (SMTP, SendGrid, Twilio, etc.)
    debe heredar de esta clase e implementar los dos métodos.
    """

    # TODO: Conectar a servicio de mensajería — reemplazar los métodos
    #       abstractos con la lógica real cuando las credenciales estén listas.

    @abstractmethod
    async def enviar_email(
        self,
        destinatario: str,
        asunto: str,
        mensaje: str,
    ) -> bool:
        """
        Envía un correo electrónico.

        Args:
            destinatario: Dirección de correo del receptor (ej: contratista@empresa.com).
            asunto:       Asunto del mensaje (ej: "Alerta: póliza por vencer").
            mensaje:      Cuerpo del mensaje en texto plano o HTML.

        Returns:
            True si el envío fue exitoso, False si falló.
        """
        ...

    @abstractmethod
    async def enviar_sms(
        self,
        numero: str,
        mensaje: str,
    ) -> bool:
        """
        Envía un SMS al número indicado.

        Args:
            numero:  Número de teléfono en formato E.164 (ej: +573001234567).
            mensaje: Texto del SMS (máx. 160 caracteres recomendado).

        Returns:
            True si el envío fue exitoso, False si falló.
        """
        ...
