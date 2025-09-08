import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class SupabaseService {
  private readonly baseUrl = process.env.SUPABASE_BASE_URL + '/rest/v1';
  private readonly apiKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // pode ser anon ou service_role
  private readonly headers = {
    apikey: this.apiKey,
    Authorization: `Bearer ${this.apiKey}`,
    'Content-Type': 'application/json',
  };

  constructor(private readonly http: HttpService) {}

  async getUsers() {
    const url = `${this.baseUrl}/users?select=*`;
    const { data } = await firstValueFrom(
      this.http.get(url, { headers: this.headers }),
    );
    return data;
  }

  async insertUser(user: any) {
    const url = `${this.baseUrl}/users`;
    const { data } = await firstValueFrom(
      this.http.post(url, user, { headers: this.headers }),
    );
    return data;
  }

  async getAgentsByUserId(userId: string) {
    console.log('base url', this.baseUrl);
    const url = `${this.baseUrl}/agents?user_id=eq.${userId}&select=*`;
    console.log('🔎 Requesting:', url);
    const { data } = await firstValueFrom(
      this.http.get(url, { headers: this.headers }),
    );
    console.log('📦 Response:', data);
    return data;
  }

  async getUserByInstanceName(instanceName: string) {
    const url = `${this.baseUrl}/whatsapp_configs?instance_name=eq.${instanceName}&select=*`;
    console.log('🔎 Requesting getUserByInstanceName:', url);
    const { data } = await firstValueFrom(
      this.http.get(url, { headers: this.headers }),
    );
    return data;
  }
}
