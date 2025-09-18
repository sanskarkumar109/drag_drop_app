from django.shortcuts import get_object_or_404
from django.views.decorators.csrf import csrf_exempt
from django.http import JsonResponse
from .models import Diagram
import json

 
# Script templates
SHAPE_SCRIPTS = {
    'rectangle': [
        "console.log('This is a computer system ID {{ id }}');",
        "// A computer might have network interfaces : ['eth0','lo']"
    ],
    'circle': [
        "console.log('Router is actively forwarding packets ID : {{ id }}');",
        "// Router configuration : {mode : 'ospf', version : 2}"
    ],
    'line': [
        "console.log('Cable connection established ID : {{ id }}');",
        "// Cable properties : {type : 'ethernet', speed : '1GBps'}"
    ],
    'triangle': [
        "console.log('Switch is handling traffic on multiple ports ID : {{ id }}');",
        "// Switch VLANs : ['VLAN10','VLAN20','VLAN30']"
    ]
}
 
def get_shape_script(request):
    shape_type = request.GET.get('type')
    script = SHAPE_SCRIPTS.get(
        shape_type,
        ["// No specific script found for this type", "// Default placeholder script"]
    )
    return JsonResponse({'script': script})
 
 
@csrf_exempt
def diagram_list_create(request):
    if request.method == 'GET':
        diagrams = Diagram.objects.all().values('id', 'name', 'created_at', 'updated_at')
        return JsonResponse(list(diagrams), safe=False)
 
    elif request.method == 'POST':
        try:
            data = json.loads(request.body)
            name = data.get('name')
            elements = data.get('elements', [])
            script = data.get('script', []) 
 
            if not name:
                return JsonResponse({'error': 'Diagram name is required.'}, status=400)
 
            diagram = Diagram.objects.create(
                name=name,
                elements=elements,
                script=script  
            )
 
            return JsonResponse({
                'id': diagram.id,
                'name': diagram.name,
                'elements': diagram.elements,
                'script': diagram.script  
            }, status=201)
 
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON in request body.'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
 
    return JsonResponse({'error': 'Method not allowed'}, status=405)
 
 
@csrf_exempt
def diagram_detail(request, pk):
    diagram = get_object_or_404(Diagram, pk=pk)
 
    if request.method == 'GET':
        return JsonResponse({
            'id': diagram.id,
            'name': diagram.name,
            'elements': diagram.elements,
            'script': diagram.script
        })
 
    elif request.method == 'PUT':
        try:
            data = json.loads(request.body)
            diagram.name = data.get('name', diagram.name)
            diagram.elements = data.get('elements', diagram.elements)
            diagram.script = data.get('script', diagram.script)  # ✅ Update script
            diagram.save()
 
            return JsonResponse({
                'id': diagram.id,
                'name': diagram.name,
                'elements': diagram.elements,
                'script': diagram.script
            })
 
        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON in request body'}, status=400)
        except Exception as e:
            return JsonResponse({'error': str(e)}, status=500)
 
    elif request.method == 'DELETE':
        diagram.delete()
        return JsonResponse({'message': 'Diagram deleted successfully'}, status=204)
 
    return JsonResponse({'error': 'Method not allowed'}, status=405)


        