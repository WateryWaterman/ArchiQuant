"""Reproducible conversion. Install torch, ultralytics, onnx first (Python 3.12).
Download the documented best.pt into tmp/floorcad.pt before running.
Only the explicit architecture classes below are allowed by the weights-only loader.
"""
import json
import os
from pathlib import Path
Path('tmp/yolo-config').mkdir(parents=True,exist_ok=True)
os.environ.setdefault('YOLO_CONFIG_DIR',str(Path('tmp/yolo-config').resolve()))
import torch
from ultralytics.nn.tasks import DetectionModel
from ultralytics.nn.modules import Bottleneck, DFL, SPPF, Concat, Conv, C2f, Detect
from torch.nn import MaxPool2d, Sequential, ModuleList, Upsample, Conv2d, Identity, SiLU, BatchNorm2d
safe=[DetectionModel,Bottleneck,DFL,SPPF,Concat,Conv,C2f,Detect,MaxPool2d,Sequential,ModuleList,Upsample,Conv2d,Identity,SiLU,BatchNorm2d]
with torch.serialization.safe_globals(safe):
    checkpoint=torch.load('tmp/floorcad.pt',map_location='cpu',weights_only=True)
model=checkpoint['model'].float().eval()
for parameter in model.parameters(): parameter.requires_grad=False
for m in model.modules():
    if isinstance(m,Detect):
        m.export=True; m.format='onnx'; m.dynamic=False
model.fuse()
image=torch.zeros(1,3,640,640)
model(image); model(image)
target=Path('public/models');target.mkdir(parents=True,exist_ok=True)
torch.onnx.export(model,image,str(target/'floorcad-yolov8n.onnx'),input_names=['images'],output_names=['output0'],opset_version=17,dynamo=False)
names=[model.names[i] for i in range(len(model.names))]
(target/'floorcad-labels.json').write_text(json.dumps(names,indent=2))
print(names)
print('Exported', (target/'floorcad-yolov8n.onnx').stat().st_size, 'bytes')
