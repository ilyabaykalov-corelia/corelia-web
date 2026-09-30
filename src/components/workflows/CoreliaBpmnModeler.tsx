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

/** Показывает только элементы, которые принимает серверный Corelia BPMN profile. */
class CoreliaPaletteProvider {
  static $inject = ['palette', 'create', 'elementFactory'];

  constructor(private readonly palette: any, private readonly create: any, private readonly elementFactory: any) {
    palette.registerProvider(this);
  }

  getPaletteEntries() {
    const entry = (type: string, className: string, title: string, options = {}) => ({
      group: 'corelia', className, title,
      action: {
        dragstart: (event: Event) => this.create.start(event, this.elementFactory.createShape({ type, ...options })),
        click: (event: Event) => this.create.start(event, this.elementFactory.createShape({ type, ...options })),
      },
    });
    return {
      'create.start-event': entry('bpmn:StartEvent', 'bpmn-icon-start-event-none', 'Start event'),
      'create.end-event': entry('bpmn:EndEvent', 'bpmn-icon-end-event-none', 'End event'),
      'create.user-task': entry('bpmn:UserTask', 'bpmn-icon-user-task', 'User task'),
      'create.service-task': entry('bpmn:ServiceTask', 'bpmn-icon-service-task', 'Service task'),
      'create.exclusive-gateway': entry('bpmn:ExclusiveGateway', 'bpmn-icon-gateway-xor', 'Exclusive gateway'),
      'create.parallel-gateway': entry('bpmn:ParallelGateway', 'bpmn-icon-gateway-parallel', 'Parallel gateway'),
      'create.timer-event': entry('bpmn:IntermediateCatchEvent', 'bpmn-icon-intermediate-event-catch-timer', 'Timer event', { eventDefinitionType: 'bpmn:TimerEventDefinition' }),
    };
  }
}

const coreliaPaletteModule = { paletteProvider: ['type', CoreliaPaletteProvider] };

/** Встраивает BPMN editor и стандартную properties panel; данные подключаются через draft API. */
export function CoreliaBpmnModeler() {
  const canvas = useRef<HTMLDivElement>(null);
  const properties = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvas.current || !properties.current) return undefined;
    const modeler = new BpmnModeler({
      container: canvas.current,
      propertiesPanel: { parent: properties.current },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, coreliaPaletteModule],
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
