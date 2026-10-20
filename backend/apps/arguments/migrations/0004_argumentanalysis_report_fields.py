import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('arguments', '0003_argumentanalysis_backing_argumentanalysis_rebuttal'),
        ('debates', '0002_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='argumentanalysis',
            name='analysis_method',
            field=models.CharField(default='rule_based', max_length=20),
        ),
        migrations.AddField(
            model_name='argumentanalysis',
            name='supporting_claims',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='argumentanalysis',
            name='evidence',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='argumentanalysis',
            name='reasoning_weaknesses',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='argumentanalysis',
            name='recommendations',
            field=models.JSONField(blank=True, default=list),
        ),
        migrations.AddField(
            model_name='argumentanalysis',
            name='improved_argument',
            field=models.TextField(blank=True, default=''),
        ),
        migrations.AddField(
            model_name='argumentanalysis',
            name='relevance_score',
            field=models.IntegerField(default=70),
        ),
        migrations.AddField(
            model_name='argumentanalysis',
            name='debate_session',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='argument_analyses',
                to='debates.debatesession',
            ),
        ),
        migrations.AddField(
            model_name='logicalfallacyinstance',
            name='confidence',
            field=models.PositiveSmallIntegerField(default=75),
        ),
    ]
