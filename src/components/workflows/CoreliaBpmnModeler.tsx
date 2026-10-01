import { useEffect, useRef } from 'react';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import {
  BpmnPropertiesPanelModule,
  BpmnPropertiesProviderModule,
} from 'bpmn-js-properties-panel';
import '@bpmn-io/properties-panel/dist/assets/properties-panel.css';
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn.css';

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
interface CoreliaBpmnModelerProps {
  bpmnXml: string;
  onChange?: (bpmnXml: string) => void;
  readOnly?: boolean;
}

export function CoreliaBpmnModeler({ bpmnXml, onChange, readOnly = false }: CoreliaBpmnModelerProps) {
  const canvas = useRef<HTMLDivElement>(null);
  const properties = useRef<HTMLDivElement>(null);
  const modeler = useRef<BpmnModeler | null>(null);
  const importedXml = useRef('');

  useEffect(() => {
    if (!canvas.current || !properties.current) return undefined;
    const instance = new BpmnModeler({
      container: canvas.current,
      propertiesPanel: { parent: properties.current },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, coreliaPaletteModule],
      moddleExtensions: { corelia: coreliaModdle },
    });
    modeler.current = instance;
    const eventBus = instance.get('eventBus') as { on: (event: string, listener: () => void) => void };
    eventBus.on('commandStack.changed', () => {
      if (!onChange) return;
      void instance.saveXML({ format: true }).then(({ xml }) => {
        if (xml) { importedXml.current = xml; onChange(xml); }
      });
    });
    return () => { modeler.current = null; instance.destroy(); };
  }, []);

  useEffect(() => {
    const instance = modeler.current;
    if (!instance || !bpmnXml || bpmnXml === importedXml.current) return;
    importedXml.current = bpmnXml;
    void instance.importXML(bpmnXml).then(() => (instance.get('canvas') as { zoom: (value: string) => void }).zoom('fit-viewport'));
  }, [bpmnXml]);

  return <div aria-readonly={readOnly} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 32%)', minHeight: 520, border: '1px solid #d9dee7' }}>
    <div ref={canvas} />
    <div ref={properties} style={{ borderLeft: '1px solid #d9dee7', overflow: 'auto' }} />
  </div>;
}
