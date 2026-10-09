'use client';

// Shared access to the signed-in transport session so non-hook code (the
// night audit test email) can call the Worker API with the same Bearer token.
export const transportApiBase = 'https://hotelx-transport-api.edwardjacob721.workers.dev';

let sessionToken = '';

export const setTransportSessionToken = (value: string) => {
  sessionToken = value;
};

export const getTransportSessionToken = () => sessionToken;
