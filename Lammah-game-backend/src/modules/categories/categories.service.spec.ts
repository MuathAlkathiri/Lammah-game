import { Types } from 'mongoose';
import { CatalogRepository } from '../catalogs/persistence/catalog.repository';
import { CategoryBannerStorageService } from './category-banner-storage.service';
import { CategoriesService } from './categories.service';
import { CategoryRepository } from './persistence/category.repository';

describe('CategoriesService', () => {
  const catalogId = new Types.ObjectId();
  const categories = {
    findBySlugExcludingId: jest.fn().mockResolvedValue(null),
    create: jest.fn(),
  } as unknown as CategoryRepository;
  const catalogs = {
    findReferenceById: jest.fn().mockResolvedValue({ _id: catalogId }),
  } as unknown as CatalogRepository;
  const banners = {
    save: jest.fn(),
    delete: jest.fn(),
  } as unknown as CategoryBannerStorageService;
  const service = new CategoriesService(categories, catalogs, banners);

  beforeEach(() => jest.clearAllMocks());

  it('validates the catalog relationship and preserves gameplay configuration', async () => {
    const created = { _id: new Types.ObjectId(), save: jest.fn() };
    created.save.mockResolvedValue(created);
    (categories.create as jest.Mock).mockResolvedValue(created);
    await service.create({
      name: 'World Cup',
      slug: 'world-cup',
      catalogId: catalogId.toString(),
      gameplayConfig: { maxAudioDuration: 6 },
    });
    expect(catalogs.findReferenceById).toHaveBeenCalledWith(
      catalogId.toString(),
    );
    expect(categories.create).toHaveBeenCalledWith(
      expect.objectContaining({
        catalogId,
        gameplayConfig: { maxAudioDuration: 6 },
      }),
    );
  });

  it('maps duplicate-key races to a stable category error', async () => {
    (categories.create as jest.Mock).mockRejectedValue({ code: 11000 });
    await expect(
      service.create({
        name: 'World Cup',
        slug: 'world-cup',
        catalogId: catalogId.toString(),
      }),
    ).rejects.toMatchObject({
      response: expect.objectContaining({ code: 'DUPLICATE_CATEGORY_SLUG' }),
    });
  });
});
