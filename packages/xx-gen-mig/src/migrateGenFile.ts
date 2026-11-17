import { LegacyResourceOptions } from './converter/resource-urls';
import { convertLegacyScene } from './converter/scene';
import { GenFile, GenFileScene } from './GenFile';
import { LegacyGenFile, ObjectSignal, UserDataset, UserDefinedList } from './model';

const DEBUG = false;

/** `migrateGenFile` 옵션. 리소스 서버 URL은 호출자가 정한다. */
export type MigrateGenFileOptions = LegacyResourceOptions;

/**
 * 레거시 GEN 객체를 `GenFile`로 변환한다.
 *
 * 이미지와 소리 URL의 서버 주소는 이 함수가 정하지 않는다.
 * 호출자가 `options.legacyResourceBaseUrl`로 넘긴다.
 * 이 값이 없으면 `legacyResourceBaseUrl is required` 오류를 던진다.
 *
 * 호출 형태:
 *
 * ```ts
 * const gen = await migrateGenFile(legacyGenObject, {
 *   legacyResourceBaseUrl: 'https://example.com/legacy-resources',
 * });
 * ```
 *
 * @param legacyGenObject 파싱한 레거시 GEN 객체. `sceneList`를 가진다.
 * @param options 리소스 서버 기준 URL과 URL 변환 함수. 기준 URL 아래 하위 경로는 `upload/`, `sound/`다.
 */
export const migrateGenFile = async (
  legacyGenObject: any,
  options: MigrateGenFileOptions,
): Promise<GenFile> => {
  // const gen: LegacyGenFile = JSON.parse(fileContents)
  const gen = legacyGenObject as LegacyGenFile;

  const userDatasets: UserDataset[] = [];

  const scenes: GenFileScene[] = [];
  for (let i = 0; i < gen.sceneList.length; i++) {
    scenes.push(
      await convertLegacyScene(
        gen.sceneList[i],
        (datasets) => {
          userDatasets.push(...datasets);
        },
        options,
      ),
    );
  }
  if (DEBUG) console.log(scenes[0].blockXml);

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

  // log.debug(scenes)
  const newGen: GenFile = {
    _version: 2,
    _fourcc: 'aimk',
    projectName: '새 프로젝트',
    createTimestamp: Date.now() / 1000,
    scenes,
    userdefinedlists,
    sharedVariables,
    userDatasets,
    userExApis: [],
    signals,
    thumbnailUrl: '',
  };
  return Promise.resolve(newGen);
};
