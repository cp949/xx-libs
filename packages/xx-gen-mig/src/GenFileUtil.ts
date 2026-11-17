import { ObjectSignal, UserDefinedList } from './model';
import { LegacyResourceOptions } from './converter/resource-urls';
import { convertLegacyScene } from './converter/scene';
import { GenFile, GenFileScene } from './GenFile';
import { LegacyGenFile } from './model/LegacyGenFile';

const noop = () => {};

export class GenFileUtil {
  static async readGenFileFromFileContents(
    fileContents: string,
    options: LegacyResourceOptions,
  ): Promise<GenFile> {
    const obj = JSON.parse(fileContents);
    if ('sceneList' in obj) {
      // legacy gen file
      return await GenFileUtil.loadLegacyGenFile(fileContents, options);
    } else if (
      obj['_fourcc'] === 'aimk' &&
      typeof obj['_version'] === 'number' &&
      obj['_version'] >= 2
    ) {
      // new type gen file
      return obj as GenFile;
    }

    // GEN 파일 형식이 올바르지 않습니다
    throw new Error('E0_GEN_FILE_INVALID');
  }

  static async loadLegacyGenFile(
    fileContents: string,
    options: LegacyResourceOptions,
  ): Promise<GenFile> {
    const gen: LegacyGenFile = JSON.parse(fileContents);

    const scenes: GenFileScene[] = [];
    for (let i = 0; i < gen.sceneList.length; i++) {
      scenes.push(await convertLegacyScene(gen.sceneList[i], noop, options));
    }
    const sharedVariables = gen.varList.map((it) => ({
      varId: it.id,
      varName: it.name,
      defaultValue: it.value,
    }));
    const signals: ObjectSignal[] = gen.signalList.map((it, i) => ({
      signalId: it,
      signalName: gen.signalNameList[i],
    }));

    const userdefinedlists: UserDefinedList[] = gen.listList.map((it, i) => ({
      listId: it.listId,
      listName: gen.listNameList[i],
      values: it.list,
    }));

    const empty: GenFile = {
      _version: 2,
      _fourcc: 'aimk',
      projectName: '새 프로젝트',
      createTimestamp: Date.now() / 1000,
      scenes,
      userdefinedlists,
      sharedVariables,
      userDatasets: [],
      userExApis: [],
      signals,
      thumbnailUrl: '',
    };
    return Promise.resolve(empty);
  }
}
