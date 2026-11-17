import { ObjectImage, UserDataset } from '../model';
import { GenFileScene } from '../GenFile';
import { migBlockXml } from '../mig-blockxml';
import { LegacyObject, LegacyScene, LegacySound } from '../model/LegacyGenFile';
import { convertLegacyObject } from './object';
import { createLegacyResourceUrls, LegacyResourceOptions } from './resource-urls';
import { convertLegacySound } from './sound';

const parsePrefix = (p: string, prefix: string, defaultFunc: () => any): any => {
  try {
    if (p.startsWith(prefix)) {
      return JSON.parse(p.substring(prefix.length));
    }
  } catch (e) {}
  return defaultFunc();
};

const convert = (scene: LegacyScene): [string, Record<string, any>] => {
  const arr = scene.data.split('&DeviedVar&');
  const [blockXml, ...restOptions] = arr;

  const params: Record<string, any> = {};
  for (let i = 0; i < restOptions.length; i++) {
    const opt = restOptions[i];
    if (opt.startsWith('jsonData=')) {
      params['jsonData'] = parsePrefix(opt, 'jsonData=', () => ({ version: '', objects: [] }));
    }
    if (opt.startsWith('soundData=')) {
      params['soundData'] = parsePrefix(opt, 'soundData=', () => []);
    }
    if (opt.startsWith('valueData=')) {
      params['valueData'] = parsePrefix(opt, 'valueData=', () => []);
    }
    if (opt.startsWith('dataset=')) {
      params['dataset'] = parsePrefix(opt, 'dataset=', () => []);
    }
  }
  if (!params['jsonData']) {
    params['jsonData'] = { version: '', objects: [] };
  }
  if (!params['soundData']) {
    params['soundData'] = [];
  }
  if (!params['valueData']) {
    params['valueData'] = [];
  }
  if (!params['dataset']) {
    params['dataset'] = [];
  }

  return [blockXml, params];
};

type LegacyDataset = {
  name: string;
  dataset: Record<string, string>;
};

const convertLegacyDatasets = (data: LegacyDataset): UserDataset => {
  return {
    datasetId: data.name, // 이름을 datasetId로 사용
    datasetName: data.name,
    accountId: 0,
    changeTimestamp: Date.now() / 1000,
    substance: data.dataset,
  } as UserDataset;
};

type UserDatasetCallback = (datasets: UserDataset[]) => void;

const _sortObjects = (objects: ObjectImage[]): ObjectImage[] => {
  const bg: ObjectImage[] = [];
  const fg: ObjectImage[] = [];
  const dup = new Set<string>();
  for (let i = 0; i < objects.length; i++) {
    const obj = objects[i];
    if (dup.has(obj.objectId)) {
      continue;
    }
    dup.add(obj.objectId);
    if (obj.isBackground) {
      bg.unshift(obj);
    } else {
      fg.unshift(obj);
    }
  }
  return fg.concat(bg);
};

export const convertLegacyScene = async (
  scene: LegacyScene,
  addDataset: UserDatasetCallback,
  options: LegacyResourceOptions,
): Promise<GenFileScene> => {
  const urls = createLegacyResourceUrls(options);
  const [blockXml, params] = convert(scene);
  const objects = (
    params['jsonData'] as {
      version: string;
      objects: LegacyObject[];
    }
  ).objects.map((obj) => convertLegacyObject(obj, urls));
  // const dup = new Set<string>()
  // const objects: ObjectImage[] = []
  // for (const obj of tmpObjects) {
  //     if (!dup.has(obj.objectId)) {
  //         dup.add(obj.objectId)
  //         objects.push(obj)
  //     }
  // }

  const sounds = (params['soundData'] as LegacySound[]).map((sound) =>
    convertLegacySound(sound, urls),
  );
  const valueDatas: any[] = params['valueData'];
  const datasets: LegacyDataset[] = params['dataset'];
  addDataset(datasets.map(convertLegacyDatasets));

  return {
    sceneId: scene.scene,
    sceneName: scene.sceneName,
    blockXml: await migBlockXml(blockXml, sounds),
    objects: _sortObjects(objects),
    sounds,
  };
};
