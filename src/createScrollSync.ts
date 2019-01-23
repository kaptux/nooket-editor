import * as debounce from 'lodash.debounce';

function showLineInfo(container, lineNumber, offset) {
  const box = document.createElement('div');
  box.style.position = 'absolute';
  box.style.top = `${offset}px`;
  box.style.left = '0';
  box.style.width = '100%';
  box.style.textAlign = 'right';
  box.style.borderTopWidth = '1px';
  box.style.borderTopColor = 'red';
  box.style.borderTopStyle = 'solid';
  box.style.color = 'red';
  box.innerText = lineNumber;

  container.appendChild(box);
}

function buildScrollMap(
  container: HTMLElement,
  selector: string,
  linesToTrack?: number[]
): any {
  const res = {};

  const lines = container.querySelectorAll(selector);

  res[-1] = { line: -1, offset: 0.0 };
  res[Number.MAX_SAFE_INTEGER] = {
    line: lines.length,
    offset: container.scrollHeight,
  };

  lines.forEach(l => {
    const lineNumber = parseInt(l.getAttribute('data-line'), 10);
    if (!linesToTrack || linesToTrack.indexOf(lineNumber) >= 0) {
      const rect = l.getBoundingClientRect();
      res[lineNumber] = { line: lineNumber, offset: rect.top - 25 };

      // showLineInfo(l.parentElement, lineNumber, rect.top - rect.height);
    }
  });

  return res;
}

function calculateScrollTop(fromScrollMap, toScrollMap, offset) {
  const linesTracked = Object.keys(fromScrollMap)
    .map(l => parseInt(l, 10))
    .sort((a, b) => a - b);
  let lineInf = null,
    lineSup = null;
  let i = 0;

  while (i < linesTracked.length) {
    const line = fromScrollMap[linesTracked[i]];
    if (line.offset > offset) {
      lineSup = line;
      break;
    }

    lineInf = line;
    i++;
  }

  const lineInfTo = toScrollMap[lineInf.line];
  const lineSupTo = toScrollMap[lineSup.line];

  const ratio =
    (lineSupTo.offset - lineInfTo.offset) / (lineSup.offset - lineInf.offset);
  const offSetFromLineInf = offset - lineInf.offset;

  return lineInfTo.offset + offSetFromLineInf * ratio;
}

export default function createScrollSync(
  source: HTMLElement,
  preview: HTMLElement
) {
  let isActive = false;
  let srcScroll = false,
    prvScroll = false;
  let prvScrollMap = null,
    srcScrollMap = null;

  const buildScrollMappings = function() {
    prvScrollMap = buildScrollMap(preview, '.line');
    srcScrollMap = buildScrollMap(
      source,
      '.CodeMirror-line',
      Object.keys(prvScrollMap).map(l => parseInt(l, 10))
    );
  };

  const updatePreviewScroll = debounce(
    function() {
      if (srcScroll) {
        srcScroll = false;
        return;
      }
      prvScroll = true;
      preview.scrollTop = calculateScrollTop(
        srcScrollMap,
        prvScrollMap,
        source.scrollTop
      );
    },
    50,
    { maxWait: 100 }
  );

  const updateSourceScroll = debounce(
    function() {
      if (prvScroll) {
        prvScroll = false;
        return;
      }
      srcScroll = true;
      source.scrollTop = calculateScrollTop(
        prvScrollMap,
        srcScrollMap,
        preview.scrollTop
      );
    },
    50,
    { maxWait: 100 }
  );

  const on = function() {
    if (!isActive) {
      buildScrollMappings();
      source.addEventListener('scroll', updatePreviewScroll);
      preview.addEventListener('scroll', updateSourceScroll);
      isActive = true;
    }
  };
  const off = function() {
    if (isActive) {
      source.removeEventListener('scroll', updatePreviewScroll);
      preview.removeEventListener('scroll', updateSourceScroll);
      isActive = false;
    }
  };

  return {
    on,
    off,
    rebuildScrollMapping: debounce(buildScrollMappings, 100),
    isActive: function() {
      return isActive;
    },
  };
}