const STRICT = false;

export type MigContext = {
  // key=resId, value=url
  soundUrls: Record<string, string>;
};

const _updateAttrRequired = (obj: any, attrName: string, attrValue: any) => {
  const attrs = obj['$'];
  if (typeof attrs === 'undefined') {
    if (STRICT) {
      throw new Error('attributes not exists');
    }
  }

  if (typeof attrs[attrName] === 'undefined') {
    if (STRICT) {
      throw new Error(`attribute not exists: ${attrName}`);
    }
  }

  attrs[attrName] = attrValue;
};

export const updateAttr = (obj: any, attrName: string, attrValue: any, required: boolean) => {
  if (required) {
    _updateAttrRequired(obj, attrName, attrValue);
    return;
  }
  if (obj['$'] && obj['$'][attrName]) {
    obj['$'][attrName] = attrValue;
  }
};

export const updateBlockType = (block: any, attrValue: any) => {
  _updateAttrRequired(block, 'type', attrValue);
};

export const findFieldByName = (block: any, fieldName: string): any | undefined => {
  if (!block['field']) return undefined;

  const fields = block['field'] as any[];
  return fields.find((it) => it['$']['name'] === fieldName);
};

export const appendField = (block: any, fieldName: string, fieldValue: string): any | undefined => {
  if (!block['field']) {
    block['field'] = [];
  }
  const fields = block['field'] as any[];
  const field = {
    $: { name: fieldName },
    _: fieldValue,
  };
  fields.unshift(field);
};

export const appendMutation = (
  block: any,
  attrName: string,
  attrValue: string,
): any | undefined => {
  if (!block['mutation']) {
    block['mutation'] = [];
  }
  const mutations = block['mutation'] as any[];
  const mutation = {
    $: { [attrName]: attrValue },
  };
  mutations.unshift(mutation);
};

export const findFieldIndexByName = (block: any, fieldName: string): number => {
  if (!block['field']) return -1;

  const fields = block['field'] as any[];
  return fields.findIndex((it, i) => it['$']['name'] === fieldName);
};

export const findValueByName = (block: any, valueName: string): any | undefined => {
  if (!block['value']) return undefined;

  const values = block['value'] as any[];
  return values.find((it) => it['$']['name'] === valueName);
};

export const updateField = (
  block: any,
  fieldName: string,
  fieldValue: any,
  required: boolean,
): any | undefined => {
  const field = findFieldByName(block, fieldName);
  if (field) {
    _updateAttrRequired(field, 'name', fieldName);
    field['_'] = fieldValue;
    return field;
  }

  const msg = `cannot find field:${fieldName} in block ` + block['$']?.['type'];
  if (STRICT) {
    // can not find
    if (required) {
      throw new Error(msg);
    }
  } else {
    console.log(msg);
  }
  return undefined;
};

export const updateFieldName = (
  block: any,
  originalFieldName: string,
  newFieldName: string,
  required: boolean,
): any | undefined => {
  const field = findFieldByName(block, originalFieldName);
  if (field) {
    _updateAttrRequired(field, 'name', newFieldName);
    return field;
  }

  const msg = `cannot find field:${originalFieldName} in block ` + block['$']?.['type'];
  if (STRICT) {
    // can not find
    if (required) {
      throw new Error(msg);
    }
  } else {
    console.log(msg);
  }
  return undefined;
};

export const removeFieldByName = (block: any, fieldName: string, required: boolean) => {
  const idx = findFieldIndexByName(block, fieldName);
  if (idx >= 0) {
    delete block['field'][idx];
    return;
  }

  const msg = `cannot find field:${fieldName} in block ` + block['$']?.['type'];
  if (STRICT) {
    // can not find
    if (required) {
      throw new Error(msg);
    }
  } else {
    console.log(msg);
  }
};

/**
 *
 * @param block
 * @param originalValueName
 * @param required
 * @returns
 */
export const updateValueName = (
  block: any,
  originalValueName: string,
  newValueName: string,
  required: boolean,
) => {
  const value = findValueByName(block, originalValueName);
  if (value) {
    _updateAttrRequired(value, 'name', newValueName);
    return;
  }

  const msg = `cannot find value:${originalValueName} in block ` + block['$']?.['type'];
  if (STRICT) {
    // can not find
    if (required) {
      throw new Error(msg);
    }
  } else {
    console.log(msg);
  }
};

export const updateSoundFieldName = (
  block: any,
  originalFieldName: string,
  newFieldName: string,
  required: boolean,
  context: MigContext,
): any | undefined => {
  const field = findFieldByName(block, originalFieldName);
  if (field) {
    // const soundId = field['_']
    // field['_'] = context.soundUrls[soundId] ?? soundId
    _updateAttrRequired(field, 'name', newFieldName);
    return field;
  }

  const msg = `cannot find field:${originalFieldName} in block ` + block['$']?.['type'];
  if (STRICT) {
    // can not find
    if (required) {
      throw new Error(msg);
    }
  } else {
    console.log(msg);
  }
  return undefined;
};
