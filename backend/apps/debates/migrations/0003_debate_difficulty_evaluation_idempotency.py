from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('debates', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='debatesession',
            name='difficulty',
            field=models.CharField(
                choices=[
                    ('BEGINNER', 'Beginner'),
                    ('INTERMEDIATE', 'Intermediate'),
                    ('ADVANCED', 'Advanced'),
                ],
                default='INTERMEDIATE',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='debatesession',
            name='evaluation',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='debateturn',
            name='analysis',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name='debateturn',
            name='client_turn_id',
            field=models.UUIDField(blank=True, null=True),
        ),
        migrations.AddConstraint(
            model_name='debateturn',
            constraint=models.UniqueConstraint(
                fields=('session', 'client_turn_id'),
                name='unique_client_turn_per_debate',
            ),
        ),
    ]
