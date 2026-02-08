const fs = require('fs');
const path = require('path');

async function downloadQuran() {
    const quranData = [];
    console.log('Kur\'an verileri indiriliyor (30 Cüz)...');

    for (let i = 1; i <= 30; i++) {
        try {
            console.log(`Cüz ${i} indiriliyor...`);
            const response = await fetch(`https://api.alquran.cloud/v1/juz/${i}/quran-uthmani`);
            const data = await response.json();

            if (data.code === 200) {
                const arabic = data.data;
                
                // Get Turkish translation separately since editions endpoint might be failing
                const trResponse = await fetch(`https://api.alquran.cloud/v1/juz/${i}/tr.diyanet`);
                const trData = await trResponse.json();
                const turkish = trData.data;

                const juzEntry = {
                    juz: i,
                    surahs: []
                };

                // Group by surah
                const surahMap = new Map();

                arabic.ayahs.forEach((ayah, index) => {
                    const surahId = ayah.surah.number;
                    if (!surahMap.has(surahId)) {
                        surahMap.set(surahId, {
                            id: surahId,
                            name: turkish.ayahs[index].surah.englishName, // Using English Name or similar
                            name_ar: ayah.surah.name,
                            ayahs: []
                        });
                    }

                    surahMap.get(surahId).ayahs.push({
                        id: ayah.numberInSurah,
                        text: turkish.ayahs[index].text,
                        text_ar: ayah.text
                    });
                });

                juzEntry.surahs = Array.from(surahMap.values());
                quranData.push(juzEntry);
            }
        } catch (error) {
            console.error(`Cüz ${i} indirilirken hata oluştu:`, error);
        }
    }

    const filePath = path.join(__dirname, '..', 'assets', 'data', 'quran.json');
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(quranData, null, 2));
    console.log('Kur\'an verileri başarıyla kaydedildi: ' + filePath);
}

downloadQuran();
