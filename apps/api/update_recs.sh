#!/bin/bash
sed -i 's|`/recommendations?limit=10&seed_tracks=${seed.id}`,|`/search?q=artist:${encodeURIComponent(seed.artists[0]?.name || "pop")}&type=track&limit=10`,|g' src/modules/discord/commands/spotify/spotify.command.ts
sed -i 's|const tracks = (recs.tracks || \[\]).map((t: any) => ({|const tracks = (recs.tracks?.items || \[\]).map((t: any) => ({|g' src/modules/discord/commands/spotify/spotify.command.ts
