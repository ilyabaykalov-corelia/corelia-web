import { useEffect, useRef } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

const emptyProcess = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:corelia="urn:corelia:bpmn" targetNamespace="urn:corelia:bpmn">
  <bpmn:process id="draft" name="Новый процесс" isExecutable="true"><bpmn:startEvent id="start" /></bpmn:process>
</bpmn:definitions>`;

const coreliaModdle = {
  name: 'Corelia',
  uri: 'urn:corelia:bpmn',
  prefix: 'corelia',
  xml: { tagAlias: 'lowerCase' },
  types: [{ name: 'ServiceTask', extends: ['bpmn:ServiceTask'], properties: [
    { name: 'taskType', isAttr: true, type: 'String' },
    { name: 'command', isAttr: true, type: 'String' },
  ] }],
};

/** Встраивает BPMN editor и стандартную properties panel; данные подключаются через draft API. */
export function CoreliaBpmnModeler() {
  const canvas = useRef<HTMLDivElement>(null);
  const properties = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvas.current || !properties.current) return undefined;
    const modeler = new BpmnModeler({
      container: canvas.current,
      propertiesPanel: { parent: properties.current },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule],
      moddleExtensions: { corelia: coreliaModdle },
    });
    void modeler.importXML(emptyProcess).then(() => (modeler.get('canvas') as { zoom: (value: string) => void }).zoom('fit-viewport'));
    return () => modeler.destroy();
  }, []);

  return <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 32%)', minHeight: 520, border: '1px solid #d9dee7' }}>
    <div ref={canvas} />
    <div ref={properties} style={{ borderLeft: '1px solid #d9dee7', overflow: 'auto' }} />
  </div>;
}
