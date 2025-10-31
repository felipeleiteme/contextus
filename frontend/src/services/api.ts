import axios from 'axios';
import { supabase } from '../config/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:8000';

const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 60000, // 60 seconds for audio processing
});

// Add auth token to all requests
apiClient.interceptors.request.use(
  async (config) => {
    const { data: { session } } = await supabase.auth.getSession();

    if (session?.access_token) {
      config.headers.Authorization = `Bearer ${session.access_token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface ProcessAudioResponse {
  success: boolean;
  user_id: string;
  subscription_status: string;
  transcription: string;
  response: string;
}

export const processAudio = async (
  audioUri: string,
  context?: string
): Promise<ProcessAudioResponse> => {
  const getFileName = (uri: string) => {
    const rawName = uri.split('/').pop();
    if (rawName && rawName.includes('.')) {
      return rawName;
    }
    return 'audio.m4a';
  };

  const getMimeType = (uri: string) => {
    const extension = uri.split('.').pop()?.toLowerCase();

    switch (extension) {
      case 'wav':
        return 'audio/wav';
      case 'mp3':
        return 'audio/mpeg';
      case 'aac':
        return 'audio/aac';
      case '3gp':
      case '3gpp':
        return 'audio/3gpp';
      case 'm4a':
      default:
        return 'audio/m4a';
    }
  };

  const formData = new FormData();

  // Prepare audio file for upload
  const audioFile: any = {
    uri: audioUri,
    type: getMimeType(audioUri),
    name: getFileName(audioUri),
  };

  formData.append('audio', audioFile);

  if (context) {
    formData.append('context_text', context);
  }

  const response = await apiClient.post<ProcessAudioResponse>(
    '/process-audio/',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  return response.data;
};

export interface SendChatMessageResponse {
  success: boolean;
  response: string;
}

export const sendChatMessage = async (
  message: string,
  context?: string
): Promise<SendChatMessageResponse> => {
  const payload: Record<string, string> = {
    message,
  };

  if (context && context.trim().length > 0) {
    payload.context_text = context.trim();
  }

  const response = await apiClient.post<SendChatMessageResponse>('/chat/', payload);
  return response.data;
};

export default apiClient;
