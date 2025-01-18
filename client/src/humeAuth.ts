import { fetchAccessToken } from 'hume';

export async function getHumeAccessToken() {
  const apiKey = 'ocPhYbHTfeKulrbozQyjtW4SAvKEXdk9FtfoSY6Plz8ZJXth' // (window as any).__VITE_HUME_API_KEY__;
  const secretKey = '8Cyu9oq2cs3onDVJdHfYvMvpadF65QgO2HDiGCcyNHjOSdI1O6r16lSkBaNtE7km' // (window as any).__VITE_HUME_SECRET_KEY__;
  console.log("API Key:", apiKey);
  console.log("Secret Key:", secretKey);


  if (!apiKey || !secretKey) {
    throw new Error('Hume API key or Secret key is missing.');
  }

  const accessToken = await fetchAccessToken({
    apiKey,
    secretKey,
  });

  if (!accessToken) {
    throw new Error('Failed to fetch Hume access token.');
  }

  return accessToken;
}


