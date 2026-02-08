-- Atomik contribution güncelleme fonksiyonu
-- Race condition'ı önler: Aynı anda birden fazla kişi güncellese bile doğru çalışır
CREATE OR REPLACE FUNCTION increment_contribution(
    p_group_id UUID, 
    p_user_id UUID, 
    p_count INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- Contribution varsa güncelle, yoksa oluştur
    INSERT INTO public.contributions (group_id, user_id, count, last_updated)
    VALUES (p_group_id, p_user_id, p_count, NOW())
    ON CONFLICT (group_id, user_id) 
    DO UPDATE SET 
        count = contributions.count + p_count,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Tek fonksiyonla hem grup hem contribution güncellemesi
CREATE OR REPLACE FUNCTION add_salavat(
    p_group_id UUID,
    p_user_id UUID,
    p_count INTEGER
)
RETURNS VOID AS $$
BEGIN
    -- 1. Grup sayısını atomik artır
    UPDATE public.groups
    SET current_count = current_count + p_count
    WHERE id = p_group_id;
    
    -- 2. Kişisel katkıyı atomik artır
    INSERT INTO public.contributions (group_id, user_id, count, last_updated)
    VALUES (p_group_id, p_user_id, p_count, NOW())
    ON CONFLICT (group_id, user_id) 
    DO UPDATE SET 
        count = contributions.count + p_count,
        last_updated = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
