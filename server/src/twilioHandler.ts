import twilio from "twilio";

/**
 * TwilioHandler class manages interactions with the Twilio API
 * and stores information about active calls.
 */
export class TwilioHandler {
  client: twilio.Twilio;
  callDetails: Map<string, any>;

  /**
   * Creates a new TwilioHandler instance.
   * Initializes the Twilio client using environment variables.
   */
  constructor() {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.callDetails = new Map();
    console.log("Twilio client initialized");
  }

  /**
   * Handles the start event for a Twilio Media Stream.
   * Fetches call details and stores them for later use.
   * 
   * @param streamSid - The SID of the media stream
   * @param callSid - The SID of the call
   * @returns A promise that resolves when the call details have been fetched and stored
   */
  async handleStartEvent(streamSid: string, callSid: string): Promise<void> {
    try {
      // Fetch call details using the Call SID
      const callInfo = await this.client.calls(callSid).fetch();

      // Store the call details mapped to the stream SID
      this.callDetails.set(streamSid, {
        callSid: callSid,
        from: callInfo.from,
        to: callInfo.to,
        direction: callInfo.direction,
        startTime: callInfo.startTime,
        status: callInfo.status
      });

      console.log(`Call details fetched and stored for call ${callSid}:`);
      console.log(`From: ${callInfo.from}`);
      console.log(`To: ${callInfo.to}`);
      console.log(`Direction: ${callInfo.direction}`);
      console.log(`Status: ${callInfo.status}`);
    } catch (error) {
      console.error(`Error fetching call details for call ${callSid}:`, error);
      throw error;
    }
  }

  /**
   * Gets the details for a specific call by stream SID.
   * 
   * @param streamSid - The SID of the media stream
   * @returns The call details or undefined if not found
   */
  getCallDetails(streamSid: string): any {
    return this.callDetails.get(streamSid);
  }

  /**
   * Removes call details when a call ends.
   * 
   * @param streamSid - The SID of the media stream
   */
  removeCallDetails(streamSid: string): void {
    if (this.callDetails.has(streamSid)) {
      this.callDetails.delete(streamSid);
      console.log(`Call details removed for stream ${streamSid}`);
    }
  }
}

