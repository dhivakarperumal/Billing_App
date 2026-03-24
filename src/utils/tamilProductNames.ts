
const PRODUCT_MAP: Record<string, string> = {
  'rice': 'அரிசி',
  'apple': 'ஆப்பிள்',
  'milk': 'பால்',
  'curd': 'தயிர்',
  'onion': 'வெங்காயம்',
  'tomato': 'தக்காளி',
  'potato': 'உருளைக்கிழங்கு',
  'sugar': 'சர்க்கரை',
  'salt': 'உப்பு',
  'oil': 'எண்ணெய்',
  'soap': 'சோப்பு',
  'dal': 'பருப்பு',
  'water': 'தண்ணீர்',
  'egg': 'முட்டை',
  'bread': 'ரொட்டி',
  'coffee': 'காபி',
  'tea': 'தேநீர்',
};

export const getTamilProductName = (name: string) => {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  return PRODUCT_MAP[lower] || null; 
};
