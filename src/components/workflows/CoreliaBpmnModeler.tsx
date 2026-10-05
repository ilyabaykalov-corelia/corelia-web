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
  types: [
    { name: 'ServiceTask', extends: ['bpmn:ServiceTask'], properties: [
      { name: 'taskType', isAttr: true, type: 'String' }, { name: 'command', isAttr: true, type: 'String' }, { name: 'labels', isAttr: true, type: 'String' },
    ] },
    { name: 'UserTask', extends: ['bpmn:UserTask'], properties: [
      { name: 'actions', isAttr: true, type: 'String' }, { name: 'labels', isAttr: true, type: 'String' },
    ] },
  ],
};

const flowableModdle = {
  name: 'Flowable', uri: 'http://flowable.org/bpmn', prefix: 'flowable', xml: { tagAlias: 'lowerCase' },
  types: [
    { name: 'UserTask', extends: ['bpmn:UserTask'], properties: [
      { name: 'assignee', isAttr: true, type: 'String' }, { name: 'candidateGroups', isAttr: true, type: 'String' },
    ] },
    { name: 'ServiceTask', extends: ['bpmn:ServiceTask'], properties: [
      { name: 'delegateExpression', isAttr: true, type: 'String' }, { name: 'async', isAttr: true, type: 'Boolean' }, { name: 'failedJobRetryTimeCycle', isAttr: true, type: 'String' },
    ] },
  ],
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
      'create.service-task': entry('bpmn:ServiceTask', 'bpmn-icon-service-task', 'Service task', { delegateExpression: '${coreliaServiceTask}', async: true, failedJobRetryTimeCycle: 'R3/PT30S', taskType: 'document-command' }),
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
  const settings = useRef<HTMLDivElement>(null);
  const modeler = useRef<BpmnModeler | null>(null);
  const importedXml = useRef('');

  useEffect(() => {
    if (!canvas.current || !properties.current) return undefined;
    const instance = new BpmnModeler({
      container: canvas.current,
      propertiesPanel: { parent: properties.current },
      additionalModules: [BpmnPropertiesPanelModule, BpmnPropertiesProviderModule, coreliaPaletteModule],
      moddleExtensions: { corelia: coreliaModdle, flowable: flowableModdle },
    });
    modeler.current = instance;
    importedXml.current = '';
    const eventBus = instance.get('eventBus') as { on: (event: string, listener: (event: any) => void) => void };
    eventBus.on('commandStack.changed', () => {
      if (!onChange) return;
      void instance.saveXML({ format: true }).then(({ xml }) => {
        if (xml) { importedXml.current = xml; onChange(xml); }
      });
    });
    eventBus.on('selection.changed', (event) => renderCoreliaSettings(settings.current, instance, event.newSelection?.[0]));
    return () => { modeler.current = null; instance.destroy(); };
  }, []);

  useEffect(() => {
    const instance = modeler.current;
    if (!instance || !bpmnXml || bpmnXml === importedXml.current) return;
    importedXml.current = bpmnXml;
    void instance.importXML(bpmnXml).then(() => (instance.get('canvas') as { zoom: (value: string) => void }).zoom('fit-viewport'));
  }, [bpmnXml]);

  return <div aria-readonly={readOnly} style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 32%)', minHeight: 520, border: '1px solid #d9dee7' }}>
    <div ref={canvas} style={{ pointerEvents: readOnly ? 'none' : undefined }} />
    <div style={{ borderLeft: '1px solid #d9dee7', overflow: 'auto', pointerEvents: readOnly ? 'none' : undefined }}><div ref={settings} /><div ref={properties} /></div>
  </div>;
}

function renderCoreliaSettings(container: HTMLDivElement | null, modeler: BpmnModeler, element: any) {
  if (!container) return;
  container.replaceChildren();
  if (!element?.businessObject) return;
  const businessObject = element.businessObject as any;
  const modeling = modeler.get('modeling') as any;
  const addField = (label: string, value: string, update: (next: string) => void) => {
    const field = document.createElement('label'); field.style.cssText = 'display:grid;gap:4px;padding:8px 12px;font:12px sans-serif;'; field.textContent = label;
    const input = document.createElement('input'); input.value = value ?? ''; input.style.cssText = 'padding:6px;border:1px solid #b8c1cc;border-radius:4px;';
    input.addEventListener('change', () => update(input.value)); field.append(input); container.append(field);
  };
  const heading = document.createElement('strong'); heading.textContent = 'Свойства Corelia'; heading.style.cssText = 'display:block;padding:12px 12px 4px;font:600 14px sans-serif;'; container.append(heading);
  addField('Label', businessObject.name ?? '', (value) => modeling.updateProperties(element, { name: value }));
  if (businessObject.$type === 'bpmn:UserTask') {
    addField('Assignee', businessObject.assignee ?? '', (value) => modeling.updateProperties(element, { assignee: value }));
    addField('Candidate groups', businessObject.candidateGroups ?? '', (value) => modeling.updateProperties(element, { candidateGroups: value }));
    addField('Task actions (коды через запятую)', businessObject.actions ?? '', (value) => modeling.updateProperties(element, { actions: value }));
    addField('Labels', businessObject.labels ?? '', (value) => modeling.updateProperties(element, { labels: value }));
  }
  if (businessObject.$type === 'bpmn:ServiceTask') {
    addField('Document command', businessObject.command ?? '', (value) => modeling.updateProperties(element, { command: value }));
    addField('Labels', businessObject.labels ?? '', (value) => modeling.updateProperties(element, { labels: value }));
  }
  if (businessObject.$type === 'bpmn:IntermediateCatchEvent') {
    const timer = businessObject.eventDefinitions?.[0];
    addField('Timer (ISO-8601)', timer?.timeDuration?.body ?? '', (value) => {
      const moddle = modeler.get('moddle') as any;
      modeling.updateModdleProperties(element, timer, { timeDuration: moddle.create('bpmn:FormalExpression', { body: value }) });
    });
  }
  if (businessObject.$type === 'bpmn:SequenceFlow') {
    addField('Condition', businessObject.conditionExpression?.body ?? '', (value) => {
      const moddle = modeler.get('moddle') as any;
      modeling.updateProperties(element, { conditionExpression: moddle.create('bpmn:FormalExpression', { body: value }) });
    });
  }
}
