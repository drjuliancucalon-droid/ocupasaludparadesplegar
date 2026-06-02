/**
 * Cliente API para comunicación con Cloudflare Worker + D1
 * Reemplaza todas las llamadas directas a localStorage
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    this.userId = null;
    this.authToken = null;
  }

  // Inicializar con credenciales del usuario autenticado
  init(userId, authToken) {
    this.userId = userId;
    this.authToken = authToken;
  }

  // Método genérico para hacer requests
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    
    if (this.userId) {
      headers['X-User-ID'] = this.userId;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
      }

      return data;
    } catch (error) {
      console.error(`API Error en ${endpoint}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // PACIENTES
  // ============================================================================

  async getPacientes() {
    return this.request('/api/pacientes');
  }

  async getPaciente(id) {
    return this.request(`/api/pacientes/${id}`);
  }

  async createPaciente(data) {
    return this.request('/api/pacientes', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updatePaciente(id, data) {
    return this.request(`/api/pacientes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deletePaciente(id) {
    return this.request(`/api/pacientes/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // EMPRESAS
  // ============================================================================

  async getEmpresas() {
    return this.request('/api/empresas');
  }

  async getEmpresa(id) {
    return this.request(`/api/empresas/${id}`);
  }

  async createEmpresa(data) {
    return this.request('/api/empresas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEmpresa(id, data) {
    return this.request(`/api/empresas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEmpresa(id) {
    return this.request(`/api/empresas/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // HISTORIAS CLÍNICAS
  // ============================================================================

  async getHistoriasClinicas(pacienteId = null) {
    const endpoint = pacienteId 
      ? `/api/historias-clinicas?paciente_id=${pacienteId}`
      : '/api/historias-clinicas';
    return this.request(endpoint);
  }

  async getHistoriaClinica(id) {
    return this.request(`/api/historias-clinicas/${id}`);
  }

  async createHistoriaClinica(data) {
    return this.request('/api/historias-clinicas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateHistoriaClinica(id, data) {
    return this.request(`/api/historias-clinicas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteHistoriaClinica(id) {
    return this.request(`/api/historias-clinicas/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // CITAS
  // ============================================================================

  async getCitas(filtro = {}) {
    const params = new URLSearchParams(filtro).toString();
    const endpoint = params ? `/api/citas?${params}` : '/api/citas';
    return this.request(endpoint);
  }

  async getCita(id) {
    return this.request(`/api/citas/${id}`);
  }

  async createCita(data) {
    return this.request('/api/citas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateCita(id, data) {
    return this.request(`/api/citas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteCita(id) {
    return this.request(`/api/citas/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // FACTURAS
  // ============================================================================

  async getFacturas(empresaId = null) {
    const endpoint = empresaId 
      ? `/api/facturas?empresa_id=${empresaId}`
      : '/api/facturas';
    return this.request(endpoint);
  }

  async getFactura(id) {
    return this.request(`/api/facturas/${id}`);
  }

  async createFactura(data) {
    return this.request('/api/facturas', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFactura(id, data) {
    return this.request(`/api/facturas/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFactura(id) {
    return this.request(`/api/facturas/${id}`, {
      method: 'DELETE',
    });
  }

  // ============================================================================
  // USUARIOS (Perfil extendido)
  // ============================================================================

  async getUsuarioProfile() {
    return this.request('/api/usuarios/profile');
  }

  async updateUsuarioProfile(data) {
    return this.request('/api/usuarios/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ============================================================================
  // SINCRONIZACIÓN
  // ============================================================================

  async triggerSync() {
    return this.request('/api/sync/trigger', {
      method: 'POST',
    });
  }

  async getSyncStatus() {
    return this.request('/api/sync/status');
  }
}

// Exportar instancia singleton
export const apiClient = new ApiClient();

// Hook personalizado para React (opcional, si se usa React)
export function useApiClient() {
  return apiClient;
}

export default ApiClient;
