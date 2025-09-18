from django.db import models
 
class Diagram(models.Model):
    name = models.CharField(
        max_length=255,
        unique=True,
        help_text="Name of the diagram"
    )
    elements = models.JSONField(
        default=list,
        help_text="JSON array of shapes in the diagram"
    )
    script = models.JSONField(
        default=list,
        blank=True,
        help_text="Generated script data for this diagram"
    )
    created_at = models.DateTimeField(
        auto_now_add=True,
        help_text="Timestamp when the diagram was created"
    )
    updated_at = models.DateTimeField(
        auto_now=True,
        help_text="Timestamp when the diagram was last updated"
    )
 
    def __str__(self):
        return self.name
 
    class Meta:
        ordering = ['-updated_at']
 