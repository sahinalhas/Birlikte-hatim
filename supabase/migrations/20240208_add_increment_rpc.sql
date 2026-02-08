-- Atomik grup salavat sayısı artırma fonksiyonu
CREATE OR REPLACE FUNCTION increment_group_count(p_group_id UUID, p_count INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE public.groups
  SET current_count = current_count + p_count
  WHERE id = p_group_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
