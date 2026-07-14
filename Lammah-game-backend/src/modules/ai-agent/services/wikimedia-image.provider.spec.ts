import { ImageDownloadService } from '../infrastructure/assets/image-download.service';
import { WikimediaImageProvider } from '../infrastructure/assets/wikimedia-image.provider';

describe('WikimediaImageProvider search candidates', () => {
  const provider = new WikimediaImageProvider({} as ImageDownloadService);

  it('builds concise character candidates in priority order', () => {
    expect(
      provider.buildCandidates({
        type: 'image',
        entity: 'Itachi Uchiha',
        franchise: 'Naruto',
        entityType: 'character',
        originalName: 'うちはイタチ',
        purpose: 'gameplay',
        query: 'من فضلك ابحث عن صورة تظهر هذه الشخصية في الأنمي',
      }),
    ).toEqual([
      'Itachi Uchiha',
      'Itachi Uchiha Naruto',
      'Itachi Uchiha portrait',
      'うちはイタチ',
      'Naruto character',
    ]);
  });

  it('uses franchise-level candidates for decorative covers', () => {
    expect(
      provider.buildCandidates({
        type: 'image',
        entity: 'Itachi Uchiha',
        franchise: 'Naruto',
        entityType: 'character',
        purpose: 'decorative',
      }),
    ).toEqual(['Naruto', 'Naruto logo', 'Naruto promotional visual']);
  });

  it('keeps a concise legacy query only as the final fallback', () => {
    expect(
      provider.buildCandidates({
        type: 'image',
        entity: 'Konoha',
        franchise: 'Naruto',
        entityType: 'location',
        query: 'Hidden Leaf Village',
        purpose: 'gameplay',
      }),
    ).toEqual([
      'Konoha',
      'Konoha Naruto',
      'Konoha location',
      'Hidden Leaf Village',
    ]);
  });
});
