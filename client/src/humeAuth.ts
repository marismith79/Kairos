export async function getHumeAccessToken() {
  try {
    const response = await fetch('http://localhost:3000/api/getHumeAccessToken'); 
    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }
    const data = await response.json();
    return data.accessToken;
  } catch (error) {
    console.error('Error fetching Hume access token from server:', error);
    throw error;
  }
}