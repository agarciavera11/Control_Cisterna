# Monitoreo de Cisterna

Aplicación web demostrativa construida con React, Tailwind CSS y Recharts. Simula el nivel de una cisterna, el caudal de salida y el consumo de agua sin necesitar sensores ni backend.

## Ejecutar localmente

```bash
npm install
npm run dev
```

La aplicación estará disponible normalmente en `http://127.0.0.1:5173`.

## Compilar

```bash
npm run build
```

## Estructura

- `src/pages`: Dashboard, Historial, Simulación y Configuración.
- `src/components`: tarjetas, visualizaciones, gráficas y navegación.
- `src/context`: estado compartido y motor de simulación.
- `src/services`: fuente de datos mock y contrato preparado para una futura API.
- `src/utils`: cálculos y formato regional en español.

Los datos y ajustes se conservan temporalmente en `localStorage` bajo la clave `cisterna-demo-v1`. La integración futura con ESP32 puede reemplazar `mockDataSource` por `apiDataSource` manteniendo la misma forma de datos normalizada.

## Alertas de nivel

En **Configuración → Umbrales de nivel** se puede habilitar la notificación nativa del navegador (por ejemplo, desde el celular) y/o un aviso por correo mediante un webhook de Make, Zapier o una Cloud Function. La aplicación alerta una vez al entrar en nivel bajo, una vez adicional si llega a crítico, y solo vuelve a armar ambas alertas cuando el nivel supera el umbral bajo.

El webhook recibe un `POST` JSON con `recipient`, `tankName`, `levelPercent`, los dos umbrales, la severidad y la fecha. Debe aceptar solicitudes CORS desde la aplicación. Para recibir avisos cuando ningún navegador esté abierto, este mismo comportamiento debe trasladarse a una Cloud Function o backend que observe Firebase.
