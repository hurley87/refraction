-- Profile favorite places (Mapbox POIs): music venue, gallery, restaurant.
ALTER TABLE players
  ADD COLUMN IF NOT EXISTS favorite_music_venue JSONB,
  ADD COLUMN IF NOT EXISTS favorite_gallery JSONB,
  ADD COLUMN IF NOT EXISTS favorite_restaurant JSONB;

COMMENT ON COLUMN players.favorite_music_venue IS
  'Favorite music venue POI: { place_id, name, address, latitude, longitude }.';
COMMENT ON COLUMN players.favorite_gallery IS
  'Favorite gallery POI: { place_id, name, address, latitude, longitude }.';
COMMENT ON COLUMN players.favorite_restaurant IS
  'Favorite restaurant POI: { place_id, name, address, latitude, longitude }.';
