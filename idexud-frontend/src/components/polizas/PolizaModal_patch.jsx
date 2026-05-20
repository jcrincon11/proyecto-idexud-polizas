// PATCH para PolizaModal.jsx — Fix del parseInt + display de errores 422
// ========================================================================
// Este no es el archivo completo. Son las ÚNICAS secciones que debes
// modificar en tu PolizaModal.jsx existente.
//
// Busca cada bloque marcado con "── BUSCA ESTO ──" y reemplázalo
// con el bloque "── REEMPLAZA CON ──" correspondiente.


// ════════════════════════════════════════════════════════════════════
// PATCH 1: Proteger el parseInt de aseguradora_id y contratista_id
// ════════════════════════════════════════════════════════════════════

// ── BUSCA ESTO en tu PolizaModal.jsx ──
/*
  payload.aseguradora_id = parseInt(payload.aseguradora_id, 10);
  payload.contratista_id = parseInt(payload.contratista_id, 10);
*/

// ── REEMPLAZA CON ──
const parsearIdSeguro = (valor) => {
  const n = parseInt(valor, 10);
  // parseInt("") → NaN, parseInt(undefined) → NaN, parseInt("abc") → NaN
  // En todos esos casos devolvemos null para que Pydantic los trate como
  // campo ausente (Optional) y no como integer inválido.
  return Number.isFinite(n) && n > 0 ? n : null;
};

// Sustituye las dos líneas originales por:
// payload.aseguradora_id = parsearIdSeguro(payload.aseguradora_id);
// payload.contratista_id = parsearIdSeguro(payload.contratista_id);


// ════════════════════════════════════════════════════════════════════
// PATCH 2: Extraer y mostrar los detalles del error 422
// Reemplaza tu bloque catch actual en handleSubmit
// ════════════════════════════════════════════════════════════════════

// ── BUSCA ESTO (tu catch actual, probablemente algo así) ──
/*
  } catch (err) {
    setError(err.message || "Error al guardar la póliza.");
  }
*/

// ── REEMPLAZA CON ──
const manejarErrorApi = async (response) => {
  // Si el servidor devolvió JSON, extraemos el detalle real
  try {
    const body = await response.json();

    // Formato del handler de validación que agregamos en main.py
    if (body.errores && Array.isArray(body.errores)) {
      return body.errores
        .map((e) => `• ${e.campo}: ${e.mensaje}`)
        .join("\n");
    }

    // Formato nativo de FastAPI 422
    if (body.detail && Array.isArray(body.detail)) {
      return body.detail
        .map((e) => {
          const campo = e.loc?.slice(1).join(" → ") || "campo desconocido";
          return `• ${campo}: ${e.msg}`;
        })
        .join("\n");
    }

    // Mensaje plano
    if (typeof body.detail === "string") return body.detail;
    return JSON.stringify(body);
  } catch {
    return `Error HTTP ${response.status}`;
  }
};

// En tu handleSubmit, reemplaza el try/catch por:
/*
  try {
    const response = await fetch("/api/v1/polizas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const mensajeError = await manejarErrorApi(response);
      setError(mensajeError);
      return;
    }

    const polizaCreada = await response.json();
    onSuccess(polizaCreada);
    onClose();

  } catch (err) {
    setError("Error de red. Verifica tu conexión.");
  }
*/


// ════════════════════════════════════════════════════════════════════
// PATCH 3: Mostrar el error en la UI con saltos de línea
// ════════════════════════════════════════════════════════════════════

// ── BUSCA ESTO (tu componente de error actual) ──
/*
  {error && <p className="text-red-500">{error}</p>}
  // o con estilos inline:
  {error && <div style={{color:"red"}}>{error}</div>}
*/

// ── REEMPLAZA CON ── (preserva saltos de línea del mensaje multi-campo)
const ErrorValidacion = ({ mensaje }) => {
  if (!mensaje) return null;
  const lineas = mensaje.split("\n");
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: "10px",
        background: "#FEF2F2",
        border: "1px solid #FECACA",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 700,
          color: "#991B1B",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          marginBottom: lineas.length > 1 ? "8px" : "0",
        }}
      >
        {lineas.length > 1 ? "Errores de validación:" : mensaje}
      </div>
      {lineas.length > 1 && (
        <ul style={{ margin: 0, padding: "0 0 0 4px", listStyle: "none" }}>
          {lineas.map((l, i) => (
            <li
              key={i}
              style={{ fontSize: "13px", color: "#B91C1C", marginTop: "4px", lineHeight: 1.5 }}
            >
              {l}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// Uso en el JSX:
// <ErrorValidacion mensaje={error} />
