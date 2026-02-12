interface PopupData {
  city: string;
  stationName: string;
  stationId: string;
  aqi: number;
  aqiCategory: string;
  pollutants: {
    pm25?: number;
    pm10?: number;
    no2?: number;
    so2?: number;
    co?: number;
    o3?: number;
  };
  weather?: {
    temperature?: number;
    humidity?: number;
    pressure?: number;
  };
  timestamp: number;
  source: string;
}

/**
 * Get EPA color threshold for a pollutant
 */
function getPollutantColor(pollutant: string, value: number): string {
  // EPA thresholds for color coding
  if (pollutant === 'pm25') {
    if (value <= 12) return '#00e400';      // Good
    if (value <= 35.4) return '#ffff00';    // Moderate
    if (value <= 55.4) return '#ff7e00';    // Unhealthy for Sensitive Groups
    if (value <= 150.4) return '#ff0000';   // Unhealthy
    if (value <= 250.4) return '#8f3f97';   // Very Unhealthy
    return '#7e0023';                        // Hazardous
  }
  if (pollutant === 'pm10') {
    if (value <= 54) return '#00e400';
    if (value <= 154) return '#ffff00';
    if (value <= 254) return '#ff7e00';
    if (value <= 354) return '#ff0000';
    if (value <= 424) return '#8f3f97';
    return '#7e0023';
  }
  // Default color for other pollutants
  return '#3b82f6';
}

/**
 * Render a single pollutant row with color coding
 */
function renderPollutant(name: string, value: number | undefined, unit: string): string {
  if (value === undefined || value === null) return '';
  const bgColor = getPollutantColor(name.toLowerCase(), value);
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin: 6px 0; padding: 6px 10px; background: ${bgColor}20; border-left: 3px solid ${bgColor}; border-radius: 4px;">
      <span style="font-size: 12px; font-weight: 600; color: #333;">${name}</span>
      <span style="font-size: 13px; font-weight: bold; color: ${bgColor};">${value.toFixed(1)} ${unit}</span>
    </div>
  `;
}

/**
 * Get AQI color based on value
 */
function getAQIColor(aqi: number): string {
  if (aqi <= 50) return '#00e400';
  if (aqi <= 100) return '#ffff00';
  if (aqi <= 150) return '#ff7e00';
  if (aqi <= 200) return '#ff0000';
  if (aqi <= 300) return '#8f3f97';
  return '#7e0023';
}

/**
 * Generate enhanced HTML for Mapbox popup
 */
export function generateEnhancedPopupHTML(data: PopupData): string {
  const color = getAQIColor(data.aqi);
  const textColor = data.aqi > 150 ? 'white' : 'black';

  return `
    <div style="padding: 12px; min-width: 280px; max-width: 320px; font-family: system-ui, -apple-system, sans-serif;">
      <!-- Header -->
      <div style="margin-bottom: 12px;">
        <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: bold; color: #1f2937;">${data.city}</h3>
        <p style="margin: 0; font-size: 11px; color: #6b7280;">${data.stationName}</p>
      </div>

      <!-- AQI Badge -->
      <div style="margin: 12px 0; padding: 12px; background: ${color}; border-radius: 8px; text-align: center;">
        <div style="font-size: 36px; font-weight: bold; color: ${textColor};">${data.aqi}</div>
        <div style="font-size: 12px; font-weight: 600; color: ${textColor}; text-transform: uppercase; letter-spacing: 0.5px;">${data.aqiCategory}</div>
      </div>

      <!-- Pollutants Section -->
      <div style="margin: 12px 0;">
        <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
          🔬 Pollutant Levels
        </div>
        ${renderPollutant('PM2.5', data.pollutants.pm25, 'µg/m³')}
        ${renderPollutant('PM10', data.pollutants.pm10, 'µg/m³')}
        ${renderPollutant('NO2', data.pollutants.no2, 'ppb')}
        ${renderPollutant('SO2', data.pollutants.so2, 'ppb')}
        ${renderPollutant('CO', data.pollutants.co, 'ppm')}
        ${renderPollutant('O3', data.pollutants.o3, 'ppb')}
      </div>

      <!-- Weather Section -->
      ${data.weather ? `
      <div style="margin: 12px 0;">
        <div style="font-size: 11px; font-weight: 600; color: #6b7280; text-transform: uppercase; margin-bottom: 8px; letter-spacing: 0.5px;">
          🌤️ Weather Conditions
        </div>
        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px;">
          ${data.weather.temperature !== undefined && data.weather.temperature !== null ? `
            <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10px; color: #6b7280;">Temperature</div>
              <div style="font-size: 16px; font-weight: bold; color: #f59e0b;">${data.weather.temperature.toFixed(1)}°C</div>
            </div>
          ` : ''}
          ${data.weather.humidity !== undefined && data.weather.humidity !== null ? `
            <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10px; color: #6b7280;">Humidity</div>
              <div style="font-size: 16px; font-weight: bold; color: #06b6d4;">${data.weather.humidity.toFixed(0)}%</div>
            </div>
          ` : ''}
          ${data.weather.pressure !== undefined && data.weather.pressure !== null ? `
            <div style="background: #f3f4f6; padding: 8px; border-radius: 6px; text-align: center;">
              <div style="font-size: 10px; color: #6b7280;">Pressure</div>
              <div style="font-size: 16px; font-weight: bold; color: #8b5cf6;">${data.weather.pressure.toFixed(0)} hPa</div>
            </div>
          ` : ''}
        </div>
      </div>
      ` : ''}

      <!-- View Trends Button -->
      <button
        onclick="window.dispatchEvent(new CustomEvent('openTrendModal', { detail: { stationId: '${data.stationId}', stationName: '${data.stationName.replace(/'/g, "\\'")}', city: '${data.city}' } }))"
        style="width: 100%; margin-top: 12px; padding: 10px; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); color: white; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 2px 4px rgba(59, 130, 246, 0.3);"
        onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(59, 130, 246, 0.4)';"
        onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(59, 130, 246, 0.3)';"
      >
        📈 View 7-Day Trend
      </button>

      <!-- Footer -->
      <div style="margin-top: 12px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; text-align: center;">
        Source: ${data.source} • Updated: ${new Date(data.timestamp).toLocaleTimeString()}
      </div>
    </div>
  `;
}
