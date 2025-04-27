import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface FormField {
  id: string;
  label: string;
  type: string;
  mapping: string | null;
}

interface EmailRuleMappingVisualizerProps {
  fields: FormField[];
  recipientType: string;
  recipientField?: string | null;
}

export default function EmailRuleMappingVisualizer({
  fields,
  recipientType,
  recipientField
}: EmailRuleMappingVisualizerProps) {
  // Filter fields that have mappings
  const mappedFields = fields.filter(field => field.mapping);
  
  // Check if the recipient field is properly mapped
  const isRecipientFieldMapped = recipientType === 'field' && 
    fields.some(field => field.mapping === 'email' || field.id === recipientField);

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-6">
        <h3 className="text-lg font-medium mb-4">Field Mapping Visualization</h3>
        
        <div className="flex flex-col space-y-4">
          {/* Recipient field indicator */}
          {recipientType === 'field' && (
            <div className="mb-2">
              <Badge variant="outline" className="mb-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100">
                Recipient Field
              </Badge>
              <div className="text-sm">
                {isRecipientFieldMapped ? (
                  <span className="flex items-center text-green-600 dark:text-green-400">
                    <CheckCircle className="h-4 w-4 mr-1" /> Properly configured
                  </span>
                ) : (
                  <span className="flex items-center text-red-600 dark:text-red-400">
                    <AlertCircle className="h-4 w-4 mr-1" /> Missing or improperly configured
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Mapping visualization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-2">Form Fields</h4>
              <div className="space-y-2">
                {fields.map(field => (
                  <div 
                    key={field.id} 
                    className={`p-2 rounded-md flex items-center justify-between ${field.mapping ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                  >
                    <div>
                      <div className="font-medium">{field.label}</div>
                      <div className="text-xs text-muted-foreground">{field.type}</div>
                    </div>
                    {field.mapping && (
                      <Badge variant="outline" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                        {field.mapping}
                      </Badge>
                    )}
                  </div>
                ))}

                {fields.length === 0 && (
                  <div className="text-muted-foreground italic">No fields available</div>
                )}
              </div>
            </div>

            <div className="border rounded-md p-4">
              <h4 className="font-medium mb-2">Available Mappings</h4>
              <div className="space-y-2">
                {['name', 'email', 'phone', 'date', 'address', 'company', 'message'].map(mapping => {
                  const fieldWithMapping = fields.find(f => f.mapping === mapping);
                  return (
                    <div 
                      key={mapping} 
                      className={`p-2 rounded-md flex items-center justify-between ${fieldWithMapping ? 'bg-green-50 dark:bg-green-900/20' : 'bg-gray-50 dark:bg-gray-800/50'}`}
                    >
                      <div className="font-medium">{mapping}</div>
                      {fieldWithMapping ? (
                        <div className="flex items-center">
                          <ArrowRight className="h-4 w-4 mr-1" />
                          <span className="text-sm">{fieldWithMapping.label}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300">
                          Unmapped
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Mapping statistics */}
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-md">
            <h4 className="font-medium mb-2">Mapping Statistics</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-2xl font-bold">{mappedFields.length}</div>
                <div className="text-sm text-muted-foreground">Mapped Fields</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{fields.length - mappedFields.length}</div>
                <div className="text-sm text-muted-foreground">Unmapped Fields</div>
              </div>
              <div>
                <div className="text-2xl font-bold">
                  {fields.length > 0 ? Math.round((mappedFields.length / fields.length) * 100) : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Mapping Coverage</div>
              </div>
            </div>
          </div>

          {/* Legend */}
          <div className="mt-2 text-sm text-muted-foreground">
            <div className="font-medium mb-1">Legend:</div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-green-500 mr-1"></div>
                <span>Mapped Field</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 rounded-full bg-gray-400 mr-1"></div>
                <span>Unmapped Field</span>
              </div>
              {recipientType === 'field' && (
                <div className="flex items-center">
                  <div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div>
                  <span>Recipient Field</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}