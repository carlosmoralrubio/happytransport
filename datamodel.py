from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import date

class Load(BaseModel):
    load_id: int
    origin: str
    destination: str
    pickup_datetime: str
    delivery_datetime: str
    equipment_type: str
    loadboard_rate: Optional[float] = None
    notes: Optional[str] = None
    weight: Optional[float] = None
    commodity_type: Optional[str] = None
    num_of_pieces: Optional[int] = None
    miles: Optional[float] = None
    dimensions: Optional[str] = None

class LoadsResponse(BaseModel):
    total_matches: int
    filters_applied: dict
    loads: list[Load]


class HealthResponse(BaseModel):
    status: str
    total_loads_in_dataset: int


class MetricRequest(BaseModel):
    load_info: str = Field(
        ..., description="General information about the load (e.g. 'Load from Dallas to Houston, Dry Van, 10k lbs')")
    origin: str = Field(
        ..., description="Origin location of the load")
    destination: str = Field(
        ..., description="Destination location of the load")
    equipment_type: str = Field(
        ..., description="Type of equipment required for the load (e.g. 'Dry Van', 'Refrigerated', 'Flatbed')")
    carrier_legal_name: str = Field(
        ..., description="Legal name of the carrier assigned to the load")
    carrier_mc_number: str = Field(
        ..., description="Carrier's MC number issued by FMCSA")
    carrier_mc_number_validity: str = Field(
        ..., description="Whether the MC number was verified as valid (true/false)")
    price_diff: str = Field(
        ..., description="Difference between the agreed price and the loadboard rate (USD). "
                         "Negative = below rate, positive = above rate.")
    duration: str = Field(
        ..., description="Time the agent took to close the process, in minutes")
    sentiment: Literal["positive", "neutral", "negative"] = Field(
        ..., description="Overall sentiment of the interaction: 'positive', 'neutral', or 'negative'")
    outcome: Literal["Booked with negotiations", "Booked without negotiations", "Not booked with negotiations", 
                     "Not booked without negotiations", "Not match", "Unknown"] = Field(
        ..., description="Final outcome of the call after the interaction.'")


class MetricResponse(BaseModel):
    status: str
    recorded_at: str
    message: str


class MetricsListResponse(BaseModel):
    total_records: int
    metrics: list[dict]