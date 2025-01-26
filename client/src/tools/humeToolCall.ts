import { Hume } from "hume";

async function param_decoding(location: string, service: string, distance: number): Promise<{ latLon: any; servicetype: string; travelLimit: string; }> {
    // fetch the location's geographic coordinates using Geocoding API
    console.log("Found geocoding API key:", process.env.AZURE_MAPS_KEY);
    const locationApiURL = `https://atlas.microsoft.com/search/address/json?api-version=1.0&query=${location}&subscription-key=${process.env.AZURE_MAPS_KEY}`;
    const locationResponse = await fetch(locationApiURL);
    const locationData = await locationResponse.json();
    // extract latitude and longitude from fetched location data
    const { lat, lon } = locationData[0];
    const latLon = `${lat},${lon}`;

    // query by specific service type
    let servicetype: string;
    if (service === "mental health") { //here you can change the resulting parameter such that a different api is queried based on the service requested
        servicetype = "mh";
    } else if (service === "substance abuse") {
        servicetype = "sa";
    } else if (service === "substance abuse") {
        servicetype = "both";
    } else {
        throw new Error("Unknown service type");
    }

    // travel limit value converted from miles to meters
    let travelLimit: string;
    travelLimit = (distance * 1609.34).toString();

    return { latLon, servicetype, travelLimit };
}

async function get_services(latLon: any, servicetype: string, travelLimit: string): Promise<any> {
    // fetch the service providers using the SAMHSA Endpoint
    const SAMHSA_Endpoint = `https://findtreatment.gov/locator/exportsAsJson/v2?sAddr=${latLon}&limitType=2&limitValue=${travelLimit}&sType=${parseFloat(servicetype)}&pageSize=4`;
    const SAMHSA_Response = await fetch(SAMHSA_Endpoint);
    const services = await SAMHSA_Response.json();
    // const SAMHSA_Data = JSON.stringify(SAMHSA_Response);

    // WRITE CODE TO UNDERSTAND HOW TO EXTRACT INFORMATION IN A FORMAT THAT IS VALUABLE
    return services; 
}

export async function handleToolCallMessage(
    toolCallMessage: Hume.empathicVoice.ToolCallMessage,
    socket: Hume.empathicVoice.chat.ChatSocket | null): Promise<void> {
    if (toolCallMessage.name === "find_services") {
      try {
        // Parse the parameters from the ToolCall message
        const args = JSON.parse(toolCallMessage.parameters) as {
          location: string;  // Renamed from sAddr
          service: string;   // Renamed from sType
          distance: number;  // Renamed from limitValue
        };
        
        // Extract the individual arguments
        const { location, service, distance } = args;
        
        // Step 1: Call param_decoding to extract latLon, servicetype, and travelLimit
        const { latLon, servicetype, travelLimit } = await param_decoding(location, service, distance);
        
        // Step 2: Call get_services with decoded parameters
        const services = await get_services(latLon, servicetype, travelLimit);

        // Send the ToolResponse message to the WebSocket with the fetched services
        const toolResponseMessage = {
          type: "tool_response",
          toolCallId: toolCallMessage.toolCallId,
          content: services,
        };

        socket?.sendToolResponseMessage(toolResponseMessage);
      } catch (error) {
        // Send ToolError message to the WebSocket if there was an error fetching the services
        const errorMessage = {
          type: "tool_error",
          toolCallId: toolCallMessage.toolCallId,
          error: "service fetcher tool error",
          content: "There was an error with fetching services.",
        };

        socket?.sendToolErrorMessage(errorMessage);
      }
    } else {
      // Send ToolError message to the WebSocket if the requested tool was not found
      const toolNotFoundErrorMessage = {
        type: "tool_error",
        toolCallId: toolCallMessage.toolCallId,
        error: "Tool not found",
        content: "The tool you requested was not found.",
      };

      socket?.sendToolErrorMessage(toolNotFoundErrorMessage);
    }
}