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
